import django.db.models.deletion
from django.conf import settings
from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations, models


def grant_comentario_perms(apps, schema_editor):
    create_permissions(django_apps.get_app_config("api"), verbosity=0)
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    perms = list(
        Permission.objects.filter(
            content_type__app_label="api",
            codename__in=["view_ventacomentario", "add_ventacomentario"],
        )
    )
    for name in ("Administrador", "Asesor", "Supervisor", "Operaciones"):
        try:
            group = Group.objects.get(name=name)
        except Group.DoesNotExist:
            continue
        group.permissions.add(*perms)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0019_change_venta_codigos"),
    ]

    operations = [
        migrations.CreateModel(
            name="VentaComentario",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("texto", models.TextField()),
                ("fecha", models.DateTimeField(auto_now_add=True)),
                (
                    "creado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="comentarios_venta",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "venta",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comentarios",
                        to="api.venta",
                    ),
                ),
            ],
            options={
                "ordering": ["fecha"],
            },
        ),
        migrations.RunPython(grant_comentario_perms, migrations.RunPython.noop),
    ]
