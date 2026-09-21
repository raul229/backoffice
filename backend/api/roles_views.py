from django.contrib.auth.models import Group, Permission, User
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from .auth_views import serialize_user


PERMISSION_CATALOG = [
    {
        "group": "Ventas",
        "items": [
            ("api.view_venta", "Ver ventas (las propias)"),
            ("api.view_all_ventas", "Ver todas las ventas"),
            ("api.add_venta", "Registrar ventas"),
            ("api.change_venta", "Editar estado y flujo de una venta"),
            ("api.change_venta_codigos", "Editar códigos de seguimiento (PSI, SIRO, orden…)"),
            ("api.reasignar_venta", "Reasignar ventas a otro asesor"),
            ("api.generar_contrato", "Generar contratos de una venta"),
            ("api.delete_venta", "Eliminar ventas"),
            ("api.view_ventapaso", "Ver historial de pasos"),
            ("api.change_ventapaso", "Cambiar estado de un paso"),
            ("api.view_ventacomentario", "Ver comentarios del historial"),
            ("api.add_ventacomentario", "Comentar en el historial de una venta"),
        ],
    },
    {
        "group": "Clientes",
        "items": [
            ("api.view_cliente", "Ver clientes"),
            ("api.add_cliente", "Crear clientes"),
            ("api.change_cliente", "Editar clientes"),
            ("api.delete_cliente", "Eliminar clientes"),
            ("api.view_persona", "Ver personas"),
            ("api.add_persona", "Crear personas"),
            ("api.change_persona", "Editar personas"),
            ("api.view_empresa", "Ver empresas"),
            ("api.add_empresa", "Crear empresas"),
            ("api.change_empresa", "Editar empresas"),
            ("api.view_direccion", "Ver direcciones"),
            ("api.add_direccion", "Crear direcciones"),
            ("api.change_direccion", "Editar direcciones"),
            ("api.delete_direccion", "Eliminar direcciones"),
        ],
    },
    {
        "group": "Catálogo y flujos",
        "items": [
            ("api.view_producto", "Ver productos"),
            ("api.add_producto", "Crear productos"),
            ("api.change_producto", "Editar productos"),
            ("api.delete_producto", "Eliminar productos"),
            ("api.view_promocion", "Ver promociones"),
            ("api.add_promocion", "Crear promociones"),
            ("api.change_promocion", "Editar promociones"),
            ("api.delete_promocion", "Eliminar promociones"),
            ("api.view_paso", "Ver catálogo de pasos"),
            ("api.add_paso", "Crear pasos"),
            ("api.change_paso", "Editar pasos"),
            ("api.delete_paso", "Eliminar pasos"),
            ("api.view_flujo", "Ver flujos"),
            ("api.add_flujo", "Crear flujos"),
            ("api.change_flujo", "Editar flujos"),
            ("api.delete_flujo", "Eliminar flujos"),
            ("api.view_flujopaso", "Ver pasos de un flujo"),
            ("api.add_flujopaso", "Agregar pasos a un flujo"),
            ("api.delete_flujopaso", "Quitar pasos de un flujo"),
            ("api.view_plantillacontrato", "Ver plantillas de contrato"),
            ("api.add_plantillacontrato", "Cargar plantillas de contrato"),
            ("api.change_plantillacontrato", "Reemplazar plantillas de contrato"),
            ("api.delete_plantillacontrato", "Quitar plantillas de contrato"),
        ],
    },
    {
        "group": "Usuarios y roles",
        "items": [
            ("auth.view_user", "Ver usuarios"),
            ("auth.add_user", "Crear usuarios"),
            ("auth.change_user", "Editar usuarios"),
            ("auth.delete_user", "Eliminar usuarios"),
            ("auth.view_group", "Ver roles"),
            ("auth.add_group", "Crear roles"),
            ("auth.change_group", "Editar roles y permisos"),
            ("auth.delete_group", "Eliminar roles"),
        ],
    },
]


class CanManageRoles(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        managing_users = "/auth/users" in request.path
        if request.method in ("GET", "HEAD", "OPTIONS"):
            if managing_users:
                return user.has_perm("auth.view_user") or user.has_perm("auth.change_user")
            return user.has_perm("auth.view_group") or user.has_perm("auth.change_group")
        if request.method == "POST":
            return user.has_perm("auth.add_user" if managing_users else "auth.add_group")
        if request.method == "DELETE":
            return user.has_perm("auth.delete_user" if managing_users else "auth.delete_group")
        return user.has_perm("auth.change_user" if managing_users else "auth.change_group")


def _perm_from_code(code):
    app_label, codename = code.split(".", 1)
    return Permission.objects.get(content_type__app_label=app_label, codename=codename)


def serialize_role(group):
    return {
        "id": group.id,
        "name": group.name,
        "permissions": sorted(
            f"{perm.content_type.app_label}.{perm.codename}"
            for perm in group.permissions.select_related("content_type")
        ),
        "users_count": group.user_set.count(),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated, CanManageRoles])
def permission_catalog(request):
    return Response(PERMISSION_CATALOG)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, CanManageRoles])
def roles(request):
    if request.method == "GET":
        return Response([serialize_role(group) for group in Group.objects.order_by("name")])

    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"name": "El nombre es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
    if Group.objects.filter(name=name).exists():
        return Response({"name": "Ya existe un rol con ese nombre."}, status=status.HTTP_400_BAD_REQUEST)
    group = Group.objects.create(name=name)
    codes = request.data.get("permissions") or []
    perms = []
    for code in codes:
        try:
            perms.append(_perm_from_code(code))
        except Permission.DoesNotExist:
            return Response(
                {"permissions": f"Permiso desconocido: {code}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    group.permissions.set(perms)
    return Response(serialize_role(group), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, CanManageRoles])
def role_detail(request, pk):
    try:
        group = Group.objects.get(pk=pk)
    except Group.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(serialize_role(group))

    if request.method == "DELETE":
        if group.user_set.exists():
            return Response(
                {"detail": "No se puede eliminar un rol que todavía tiene usuarios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    name = request.data.get("name")
    if name is not None:
        name = name.strip()
        if not name:
            return Response({"name": "El nombre es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        if Group.objects.exclude(pk=group.pk).filter(name=name).exists():
            return Response({"name": "Ya existe un rol con ese nombre."}, status=status.HTTP_400_BAD_REQUEST)
        group.name = name
        group.save(update_fields=["name"])
    if "permissions" in request.data:
        perms = []
        for code in request.data.get("permissions") or []:
            try:
                perms.append(_perm_from_code(code))
            except Permission.DoesNotExist:
                return Response(
                    {"permissions": f"Permiso desconocido: {code}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        group.permissions.set(perms)
    return Response(serialize_role(group))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, CanManageRoles])
def users(request):
    if request.method == "GET":
        return Response(
            [serialize_user(user) for user in User.objects.order_by("username").prefetch_related("groups")]
        )

    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    if not username or not password:
        return Response(
            {"detail": "Usuario y contraseña son obligatorios."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(username=username).exists():
        return Response({"username": "Ese usuario ya existe."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create(
        username=username,
        first_name=request.data.get("first_name") or "",
        last_name=request.data.get("last_name") or "",
        email=request.data.get("email") or "",
        is_active=request.data.get("is_active", True),
        password=make_password(password),
    )
    group_ids = request.data.get("groups") or []
    if group_ids:
        user.groups.set(Group.objects.filter(id__in=group_ids))
    return Response(serialize_user(user), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated, CanManageRoles])
def user_detail(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(serialize_user(user))

    if request.method == "DELETE":
        if user.pk == request.user.pk:
            return Response(
                {"detail": "No puedes eliminar tu propio usuario."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            user.is_superuser
            and User.objects.filter(is_superuser=True).exclude(pk=user.pk).count() == 0
        ):
            return Response(
                {"detail": "No se puede eliminar el último administrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if "username" in request.data:
        username = (request.data.get("username") or "").strip()
        if not username:
            return Response({"username": "El usuario es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.exclude(pk=user.pk).filter(username=username).exists():
            return Response({"username": "Ese usuario ya existe."}, status=status.HTTP_400_BAD_REQUEST)
        user.username = username
    for field in ("first_name", "last_name", "email"):
        if field in request.data:
            setattr(user, field, request.data.get(field) or "")
    if "is_active" in request.data:
        if user.pk == request.user.pk and not bool(request.data["is_active"]):
            return Response(
                {"detail": "No puedes desactivar tu propio usuario."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = bool(request.data["is_active"])
    if request.data.get("password"):
        user.set_password(request.data["password"])
    user.save()
    if "groups" in request.data:
        user.groups.set(Group.objects.filter(id__in=request.data.get("groups") or []))
    return Response(serialize_user(user))
