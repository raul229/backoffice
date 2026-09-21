from django.contrib.auth.models import Permission, User
from django.db import transaction
from django.db.models import F, Q
from django.db.models.deletion import ProtectedError
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import DjangoModelPermissions, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import (
    Cliente,
    Direccion,
    Empresa,
    Flujo,
    FlujoPaso,
    Paso,
    Persona,
    Producto,
    Promocion,
    PromocionVenta,
    Venta,
    VentaComentario,
    VentaPaso,
)
from .workflow import reordenar_pasos_de_flujo, sync_estado_venta_con_pasos, sync_ventas_con_flujo
from .contratos import generar_zip_entel
from .serializers import (
    CHOICE_GROUPS,
    ClienteSerializer,
    DireccionSerializer,
    EmpresaSerializer,
    FlujoPasoSerializer,
    FlujoSerializer,
    PasoSerializer,
    PersonaSerializer,
    ProductoSerializer,
    PromocionSerializer,
    PromocionVentaSerializer,
    VENTA_CODIGO_FIELDS,
    VentaComentarioSerializer,
    VentaPasoSerializer,
    VentaSerializer,
    serialize_choices,
    user_brief,
)


class VentaModelPermissions(DjangoModelPermissions):
    def has_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            keys = {str(key) for key in request.data.keys()}
            if (
                keys
                and keys <= set(VENTA_CODIGO_FIELDS)
                and (
                    request.user.is_superuser
                    or request.user.has_perm("api.change_venta_codigos")
                )
            ):
                return True
            if keys == {"creado_por"} and (
                request.user.is_superuser or request.user.has_perm("api.reasignar_venta")
            ):
                return True
        return super().has_permission(request, view)


class AuthenticatedModelViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, DjangoModelPermissions]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                {"detail": "No se puede eliminar porque otros registros lo están usando."}
            )


class ClienteViewSet(AuthenticatedModelViewSet):
    queryset = Cliente.objects.select_related(
        "persona", "empresa", "empresa__representante_legal"
    ).prefetch_related("direccion_set")
    serializer_class = ClienteSerializer


class PersonaViewSet(AuthenticatedModelViewSet):
    queryset = Persona.objects.select_related("cliente").all()
    serializer_class = PersonaSerializer


class EmpresaViewSet(AuthenticatedModelViewSet):
    queryset = Empresa.objects.select_related(
        "cliente", "representante_legal", "representante_legal__cliente"
    ).all()
    serializer_class = EmpresaSerializer


class DireccionViewSet(AuthenticatedModelViewSet):
    queryset = Direccion.objects.select_related("cliente").all()
    serializer_class = DireccionSerializer


class ProductoViewSet(AuthenticatedModelViewSet):
    queryset = Producto.objects.order_by("nombre")
    serializer_class = ProductoSerializer


class PromocionViewSet(AuthenticatedModelViewSet):
    queryset = Promocion.objects.order_by("nombre")
    serializer_class = PromocionSerializer


class PasoViewSet(AuthenticatedModelViewSet):
    queryset = Paso.objects.all()
    serializer_class = PasoSerializer

    def perform_destroy(self, instance):
        usados = FlujoPaso.objects.filter(paso=instance).select_related("flujo")
        if usados.exists():
            nombres = ", ".join(usados.values_list("flujo__nombre", flat=True))
            raise ValidationError(
                {"detail": f"Quita el paso de estos flujos antes de eliminarlo: {nombres}."}
            )
        instance.delete()


class FlujoViewSet(AuthenticatedModelViewSet):
    queryset = Flujo.objects.prefetch_related("flujopaso_set__paso").all()
    serializer_class = FlujoSerializer

    def perform_destroy(self, instance):
        ventas = instance.venta_set.count()
        if ventas:
            raise ValidationError(
                {
                    "detail": f"No se puede eliminar el flujo: hay {ventas} venta(s) usándolo."
                }
            )
        FlujoPaso.objects.filter(flujo=instance).delete()
        instance.delete()

    @action(detail=True, methods=["patch"], url_path="reordenar-pasos")
    def reordenar_pasos(self, request, pk=None):
        flujo = self.get_object()
        ids = request.data.get("ids")
        reordenar_pasos_de_flujo(flujo, ids)
        flujo = self.get_queryset().get(pk=flujo.pk)
        return Response(self.get_serializer(flujo).data)


class FlujoPasoViewSet(AuthenticatedModelViewSet):
    queryset = FlujoPaso.objects.select_related("flujo", "paso").order_by(
        "flujo_id", "orden"
    )
    serializer_class = FlujoPasoSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        sync_ventas_con_flujo(instance.flujo)

    @transaction.atomic
    def perform_destroy(self, instance):
        flujo = instance.flujo
        instance.delete()
        restantes = FlujoPaso.objects.filter(flujo_id=flujo.id)
        restantes.update(orden=F("orden") + 1000)
        for index, item in enumerate(restantes.order_by("orden"), start=1):
            item.orden = index
            item.save(update_fields=["orden"])
        sync_ventas_con_flujo(flujo)


class VentaViewSet(AuthenticatedModelViewSet):
    permission_classes = [IsAuthenticated, VentaModelPermissions]
    queryset = (
        Venta.objects.select_related(
            "cliente",
            "cliente__persona",
            "cliente__empresa",
            "cliente__empresa__representante_legal",
            "producto",
            "flujo",
            "creado_por",
            "direccion",
        )
        .prefetch_related(
            "promociones",
            "ventapaso_set__flujo_paso__paso",
            "comentarios__creado_por",
        )
        .order_by("-actualizado", "-id")
    )
    serializer_class = VentaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser or user.has_perm("api.view_all_ventas"):
            return queryset
        return queryset.filter(creado_por=user)

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        sync_ventas_con_flujo(instance.flujo, ventas=Venta.objects.filter(pk=instance.pk))
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="generar-contrato",
        permission_classes=[IsAuthenticated],
    )
    def generar_contrato(self, request, pk=None):
        if not request.user.is_superuser and not request.user.has_perm("api.generar_contrato"):
            raise PermissionDenied("No tienes permiso para generar contratos.")
        venta = self.get_object()
        contenido, nombre = generar_zip_entel(
            venta,
            fecha=request.data.get("fecha"),
            direccion=request.data.get("direccion"),
        )
        response = HttpResponse(contenido, content_type="application/zip")
        response["Content-Disposition"] = content_disposition_header(True, nombre)
        return response


class PromocionVentaViewSet(AuthenticatedModelViewSet):
    queryset = PromocionVenta.objects.select_related("venta", "promocion").all()
    serializer_class = PromocionVentaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser or user.has_perm("api.view_all_ventas"):
            return queryset
        return queryset.filter(venta__creado_por=user)


class VentaPasoViewSet(AuthenticatedModelViewSet):
    queryset = VentaPaso.objects.select_related("venta", "flujo_paso__paso").all()
    serializer_class = VentaPasoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser or user.has_perm("api.view_all_ventas"):
            return queryset
        return queryset.filter(venta__creado_por=user)

    def perform_update(self, serializer):
        paso = serializer.save()
        sync_estado_venta_con_pasos(paso.venta)
        paso.venta.save(update_fields=["actualizado"])


class VentaComentarioViewSet(AuthenticatedModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    queryset = VentaComentario.objects.select_related("venta", "creado_por").order_by("fecha")
    serializer_class = VentaComentarioSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser or user.has_perm("api.view_all_ventas"):
            return queryset
        return queryset.filter(venta__creado_por=user)

    def perform_create(self, serializer):
        comentario = serializer.save(creado_por=self.request.user)
        comentario.venta.save(update_fields=["actualizado"])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def choices(request):
    return Response(
        {name: serialize_choices(choices) for name, choices in CHOICE_GROUPS.items()}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def asesores(request):
    user = request.user
    if not (user.is_superuser or user.has_perm("api.reasignar_venta")):
        return Response(
            {"detail": "No tienes permiso para listar asesores."},
            status=403,
        )
    perm = Permission.objects.get(content_type__app_label="api", codename="add_venta")
    queryset = (
        User.objects.filter(is_active=True)
        .filter(Q(is_superuser=True) | Q(user_permissions=perm) | Q(groups__permissions=perm))
        .distinct()
        .order_by("first_name", "last_name", "username")
    )
    return Response([user_brief(item) for item in queryset])
