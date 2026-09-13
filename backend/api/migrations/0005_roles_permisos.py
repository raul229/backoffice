from django.apps import apps as django_apps
from django.contrib.auth.hashers import make_password
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

USERS = [
    {
        "username": "asesor",
        "password": "asesor123",
        "first_name": "Ana",
        "last_name": "Asesor",
        "group": "Asesor",
        "is_superuser": False,
        "is_staff": False,
    },
    {
        "username": "supervisor",
        "password": "supervisor123",
        "first_name": "Luis",
        "last_name": "Supervisor",
        "group": "Supervisor",
        "is_superuser": False,
        "is_staff": False,
    },
    {
        "username": "operaciones",
        "password": "operaciones123",
        "first_name": "Marta",
        "last_name": "Operaciones",
        "group": "Operaciones",
        "is_superuser": False,
        "is_staff": False,
    },
    {
        "username": "admin",
        "password": "admin123",
        "first_name": "Raul",
        "last_name": "Admin",
        "group": "Administrador",
        "is_superuser": True,
        "is_staff": True,
    },
]


def seed_roles(apps, schema_editor):
    create_permissions(django_apps.get_app_config("api"), verbosity=0)
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    User = apps.get_model("auth", "User")

    api_perms = list(Permission.objects.filter(content_type__app_label="api"))
    groups = {}
    for name, codenames in ROLES.items():
        group, _ = Group.objects.get_or_create(name=name)
        if codenames is None:
            group.permissions.set(api_perms)
        else:
            group.permissions.set(
                Permission.objects.filter(
                    content_type__app_label="api", codename__in=codenames
                )
            )
        groups[name] = group

    for spec in USERS:
        user, created = User.objects.get_or_create(
            username=spec["username"],
            defaults={
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "is_superuser": spec["is_superuser"],
                "is_staff": spec["is_staff"],
                "password": make_password(spec["password"]),
            },
        )
        if created or not user.groups.filter(name=spec["group"]).exists():
            user.groups.add(groups[spec["group"]])


def unseed_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=ROLES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_reparar_pasos_ventas"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(seed_roles, unseed_roles),
    ]
