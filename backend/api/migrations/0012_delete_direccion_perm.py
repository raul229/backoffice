from django.db import migrations


def grant_delete_direccion(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    try:
        perm = Permission.objects.get(
            content_type__app_label="api",
            codename="delete_direccion",
        )
    except Permission.DoesNotExist:
        return
    for name in ("Administrador", "Asesor"):
        try:
            group = Group.objects.get(name=name)
        except Group.DoesNotExist:
            continue
        group.permissions.add(perm)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0011_alter_flujo_tipo_cliente"),
    ]

    operations = [
        migrations.RunPython(grant_delete_direccion, migrations.RunPython.noop),
    ]
