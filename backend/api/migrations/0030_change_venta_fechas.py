from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations


def grant_change_venta_fechas(apps, schema_editor):
    create_permissions(django_apps.get_app_config("api"), verbosity=0)
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    content_type, _ = ContentType.objects.get_or_create(app_label="api", model="venta")
    perm, _ = Permission.objects.get_or_create(
        content_type=content_type,
        codename="change_venta_fechas",
        defaults={"name": "Puede editar fecha de ingreso e instalación de una venta"},
    )
    for name in ("Administrador", "Supervisor"):
        try:
            group = Group.objects.get(name=name)
        except Group.DoesNotExist:
            continue
        group.permissions.add(perm)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_tipo_galeria"),
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
                    (
                        "change_venta_fechas",
                        "Puede editar fecha de ingreso e instalación de una venta",
                    ),
                    ("reasignar_venta", "Puede reasignar ventas a otro asesor"),
                    ("generar_contrato", "Puede generar contratos de una venta"),
                ]
            },
        ),
        migrations.RunPython(grant_change_venta_fechas, migrations.RunPython.noop),
    ]
