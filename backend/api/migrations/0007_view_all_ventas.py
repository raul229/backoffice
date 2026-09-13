from django.db import migrations


def grant_view_all(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    content_type, _ = ContentType.objects.get_or_create(app_label="api", model="venta")
    perm, _ = Permission.objects.get_or_create(
        content_type=content_type,
        codename="view_all_ventas",
        defaults={"name": "Puede ver todas las ventas"},
    )
    for name in ("Administrador", "Supervisor"):
        try:
            group = Group.objects.get(name=name)
        except Group.DoesNotExist:
            continue
        group.permissions.add(perm)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_venta_creado_por"),
    ]

    operations = [
        migrations.RunPython(grant_view_all, migrations.RunPython.noop),
    ]
