from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ClienteViewSet,
    DireccionViewSet,
    EmpresaViewSet,
    FlujoPasoViewSet,
    FlujoViewSet,
    PasoViewSet,
    PersonaViewSet,
    ProductoViewSet,
    PromocionVentaViewSet,
    PromocionViewSet,
    VentaPasoViewSet,
    VentaViewSet,
    choices,
)

router = DefaultRouter()
router.register("clientes", ClienteViewSet)
router.register("personas", PersonaViewSet)
router.register("empresas", EmpresaViewSet)
router.register("direcciones", DireccionViewSet)
router.register("productos", ProductoViewSet)
router.register("promociones", PromocionViewSet)
router.register("pasos", PasoViewSet)
router.register("flujos", FlujoViewSet)
router.register("flujo-pasos", FlujoPasoViewSet)
router.register("ventas", VentaViewSet)
router.register("promocion-ventas", PromocionVentaViewSet)
router.register("venta-pasos", VentaPasoViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("choices/", choices, name="api-choices"),
]
