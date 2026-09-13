from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import change_password, csrf, login_view, logout_view, me
from .roles_views import permission_catalog, role_detail, roles, user_detail, users
from .lookup_views import lookup_direccion, lookup_ruc
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
    path("lookup/ruc/", lookup_ruc, name="api-lookup-ruc"),
    path("lookup/direccion/", lookup_direccion, name="api-lookup-direccion"),
    path("auth/csrf/", csrf, name="api-csrf"),
    path("auth/login/", login_view, name="api-login"),
    path("auth/logout/", logout_view, name="api-logout"),
    path("auth/me/", me, name="api-me"),
    path("auth/change-password/", change_password, name="api-change-password"),
    path("auth/permissions/", permission_catalog, name="api-permissions"),
    path("auth/roles/", roles, name="api-roles"),
    path("auth/roles/<int:pk>/", role_detail, name="api-role-detail"),
    path("auth/users/", users, name="api-users"),
    path("auth/users/<int:pk>/", user_detail, name="api-user-detail"),
]
