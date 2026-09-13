from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


def serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
        "is_active": user.is_active,
        "groups": list(user.groups.values_list("name", flat=True)),
        "permissions": sorted(user.get_all_permissions()),
    }


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    return Response({"detail": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Usuario o contraseña incorrectos."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user.is_active:
        return Response(
            {"detail": "Esta cuenta está desactivada."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    login(request, user)
    return Response(serialize_user(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(serialize_user(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    current = request.data.get("current_password") or ""
    new = request.data.get("new_password") or ""
    confirm = request.data.get("confirm_password") or ""

    if not request.user.check_password(current):
        return Response(
            {"current_password": "La contraseña actual no es correcta."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not new:
        return Response(
            {"new_password": "La nueva contraseña es obligatoria."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new != confirm:
        return Response(
            {"confirm_password": "Las contraseñas no coinciden."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if new == current:
        return Response(
            {"new_password": "La nueva contraseña debe ser distinta a la actual."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        validate_password(new, request.user)
    except DjangoValidationError as error:
        return Response(
            {"new_password": list(error.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.set_password(new)
    request.user.save(update_fields=["password"])
    update_session_auth_hash(request, request.user)
    return Response({"detail": "Contraseña actualizada."})
