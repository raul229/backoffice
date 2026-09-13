from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations

ROLES = {
    "Administrador": None,
    "Asesor": [
        "view_cliente",
        "add_cliente",
        "change_cliente",
        "view_persona",
        "add_persona",
        "change_persona",
        "view_empresa",
        "add_empresa",
        "change_empresa",
        "view_direccion",
        "add_direccion",
        "change_direccion",
        "view_producto",
        "view_promocion",
        "view_paso",
        "view_flujo",
        "view_flujopaso",
        "view_venta",
        "add_venta",
        "view_ventapaso",
        "view_promocionventa",
        "add_promocionventa",
    ],
    "Supervisor": [
        "view_cliente",
        "view_persona",
        "view_empresa",
        "view_direccion",
        "view_producto",
        "view_promocion",
        "view_paso",
        "view_flujo",
        "view_flujopaso",
        "view_venta",
        "change_venta",
        "view_ventapaso",
        "change_ventapaso",
        "view_promocionventa",
    ],
    "Operaciones": [
        "view_cliente",
        "view_persona",
        "view_empresa",
        "view_producto",
        "view_promocion",
        "view_paso",
        "view_flujo",
        "view_flujopaso",
        "view_venta",
        "view_ventapaso",
        "change_ventapaso",
        "view_promocionventa",
    ],
}


def reseed(apps, schema_editor):
    create_permissions(django_apps.get_app_config("api"), verbosity=0)
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")

    api_perms = list(Permission.objects.filter(content_type__app_label="api"))
    for name, codenames in ROLES.items():
        try:
            group = Group.objects.get(name=name)
        except Group.DoesNotExist:
            continue
        if codenames is None:
            group.permissions.set(api_perms)
        else:
            group.permissions.set(
                Permission.objects.filter(
                    content_type__app_label="api",
                    codename__in=codenames,
                )
            )

    content_type, _ = ContentType.objects.get_or_create(app_label="api", model="venta")
    view_all, _ = Permission.objects.get_or_create(
        content_type=content_type,
        codename="view_all_ventas",
        defaults={"name": "Puede ver todas las ventas"},
    )
    auth_perms = list(
        Permission.objects.filter(
            content_type__app_label="auth",
            codename__in=[
                "view_user",
                "add_user",
                "change_user",
                "view_group",
                "add_group",
                "change_group",
                "delete_group",
            ],
        )
    )
    try:
        admin = Group.objects.get(name="Administrador")
        admin.permissions.add(*auth_perms, view_all)
    except Group.DoesNotExist:
        pass
    try:
        supervisor = Group.objects.get(name="Supervisor")
        supervisor.permissions.add(view_all)
    except Group.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_view_all_ventas"),
    ]

    operations = [
        migrations.RunPython(reseed, migrations.RunPython.noop),
    ]
