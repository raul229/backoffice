from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions
from django.db import migrations, models
import django.db.models.deletion


TIPOS_INICIALES = ("GALERIA", "CENTRO COMERCIAL")


def seed_and_grant(apps, schema_editor):
    create_permissions(django_apps.get_app_config("api"), verbosity=0)

    TipoGaleria = apps.get_model("api", "TipoGaleria")
    Direccion = apps.get_model("api", "Direccion")
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")

    for nombre in TIPOS_INICIALES:
        TipoGaleria.objects.get_or_create(nombre=nombre)

    galeria = TipoGaleria.objects.filter(nombre="GALERIA").first()
    if galeria:
        Direccion.objects.exclude(galeria="").filter(tipo_galeria_id__isnull=True).update(
            tipo_galeria=galeria
        )

    content_type, _ = ContentType.objects.get_or_create(app_label="api", model="tipogaleria")
    permisos = list(
        Permission.objects.filter(
            content_type=content_type,
            codename__in=[
                "view_tipogaleria",
                "add_tipogaleria",
                "change_tipogaleria",
                "delete_tipogaleria",
            ],
        )
    )
    try:
        admin = Group.objects.get(name="Administrador")
    except Group.DoesNotExist:
        return
    if permisos:
        admin.permissions.add(*permisos)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0028_venta_fechas_estado"),
    ]

    operations = [
        migrations.CreateModel(
            name="TipoGaleria",
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
                ("nombre", models.CharField(max_length=80, unique=True)),
            ],
            options={
                "ordering": ["nombre"],
                "verbose_name": "tipo de galería",
                "verbose_name_plural": "tipos de galería",
            },
        ),
        migrations.AddField(
            model_name="direccion",
            name="tipo_galeria",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="direcciones",
                to="api.tipogaleria",
            ),
        ),
        migrations.RunPython(seed_and_grant, migrations.RunPython.noop),
    ]
