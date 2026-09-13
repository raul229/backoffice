from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def asignar_ventas_existentes(apps, schema_editor):
    Venta = apps.get_model("api", "Venta")
    User = apps.get_model("auth", "User")
    admin = User.objects.filter(is_superuser=True).order_by("id").first()
    if admin:
        Venta.objects.filter(creado_por__isnull=True).update(creado_por=admin)


def grant_auth_perms(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    try:
        admin = Group.objects.get(name="Administrador")
    except Group.DoesNotExist:
        return
    auth_perms = Permission.objects.filter(
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
    admin.permissions.add(*auth_perms)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0005_roles_permisos"),
    ]

    operations = [
        migrations.AddField(
            model_name="venta",
            name="creado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="ventas",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterModelOptions(
            name="venta",
            options={
                "permissions": [("view_all_ventas", "Puede ver todas las ventas")],
            },
        ),
        migrations.RunPython(asignar_ventas_existentes, migrations.RunPython.noop),
        migrations.RunPython(grant_auth_perms, migrations.RunPython.noop),
    ]
