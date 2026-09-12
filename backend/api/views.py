from rest_framework.decorators import api_view
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


class ClienteViewSet(ModelViewSet):
    queryset = Cliente.objects.select_related("persona", "empresa").prefetch_related(
        "direccion_set"
    )
    serializer_class = ClienteSerializer


class PersonaViewSet(ModelViewSet):
    queryset = Persona.objects.select_related("cliente").all()
    serializer_class = PersonaSerializer


class EmpresaViewSet(ModelViewSet):
    queryset = Empresa.objects.select_related(
        "cliente", "representante_legal", "representante_legal__cliente"
    ).all()
    serializer_class = EmpresaSerializer


class DireccionViewSet(ModelViewSet):
    queryset = Direccion.objects.select_related("cliente").all()
    serializer_class = DireccionSerializer


class ProductoViewSet(ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer


class PromocionViewSet(ModelViewSet):
    queryset = Promocion.objects.all()
    serializer_class = PromocionSerializer


class PasoViewSet(ModelViewSet):
    queryset = Paso.objects.all()
    serializer_class = PasoSerializer


class FlujoViewSet(ModelViewSet):
    queryset = Flujo.objects.prefetch_related("flujopaso_set__paso").all()
    serializer_class = FlujoSerializer


class FlujoPasoViewSet(ModelViewSet):
    queryset = FlujoPaso.objects.select_related("flujo", "paso").order_by(
        "flujo_id", "orden"
    )
    serializer_class = FlujoPasoSerializer


class VentaViewSet(ModelViewSet):
    queryset = (
        Venta.objects.select_related(
            "cliente",
            "cliente__persona",
            "cliente__empresa",
            "producto",
            "flujo",
        )
        .prefetch_related("promociones", "ventapaso_set__flujo_paso__paso")
        .all()
    )
    serializer_class = VentaSerializer


class PromocionVentaViewSet(ModelViewSet):
    queryset = PromocionVenta.objects.select_related("venta", "promocion").all()
    serializer_class = PromocionVentaSerializer


class VentaPasoViewSet(ModelViewSet):
    queryset = VentaPaso.objects.select_related("venta", "flujo_paso__paso").all()
    serializer_class = VentaPasoSerializer


@api_view(["GET"])
def choices(request):
    return Response(
        {name: serialize_choices(choices) for name, choices in CHOICE_GROUPS.items()}
    )
