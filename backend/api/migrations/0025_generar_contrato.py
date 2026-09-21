from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations


def grant_generar_contrato(apps, schema_editor):
    create_permissions(django_apps.get_app_config("api"), verbosity=0)
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    content_type, _created = ContentType.objects.get_or_create(app_label="api", model="venta")
    permiso, _created = Permission.objects.get_or_create(
        content_type=content_type,
        codename="generar_contrato",
        defaults={"name": "Puede generar contratos de una venta"},
    )
    for name in ("Administrador", "Supervisor", "Operaciones"):
        try:
            group = Group.objects.get(name=name)
        except Group.DoesNotExist:
            continue
        group.permissions.add(permiso)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0024_venta_actualizado"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="venta",
            options={
                "permissions": [
                    ("view_all_ventas", "Puede ver todas las ventas"),
                    (
                        "change_venta_codigos",
                        "Puede editar códigos de seguimiento de una venta",
                    ),
                    ("reasignar_venta", "Puede reasignar ventas a otro asesor"),
                    ("generar_contrato", "Puede generar contratos de una venta"),
                ]
            },
        ),
        migrations.RunPython(grant_generar_contrato, migrations.RunPython.noop),
    ]
