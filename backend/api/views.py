from django.db import transaction
from django.db.models import F
from django.db.models.deletion import ProtectedError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
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
    VentaPaso,
)
from .workflow import sync_ventas_con_flujo
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
    VentaPasoSerializer,
    VentaSerializer,
    serialize_choices,
)


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
        .prefetch_related("promociones", "ventapaso_set__flujo_paso__paso")
        .all()
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def choices(request):
    return Response(
        {name: serialize_choices(choices) for name, choices in CHOICE_GROUPS.items()}
    )
