from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0031_change_venta_producto"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductoPlantilla",
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
                ("clave", models.CharField(max_length=40)),
                (
                    "producto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plantillas",
                        to="api.producto",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ProductoPromocionPlantilla",
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
                ("clave", models.CharField(max_length=40)),
                (
                    "producto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plantillas_promocion",
                        to="api.producto",
                    ),
                ),
                (
                    "promocion",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="plantillas_producto",
                        to="api.promocion",
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="producto",
            name="promociones",
            field=models.ManyToManyField(
                blank=True, related_name="productos", to="api.promocion"
            ),
        ),
        migrations.AddConstraint(
            model_name="productoplantilla",
            constraint=models.UniqueConstraint(
                fields=("producto", "clave"),
                name="unique_producto_plantilla",
            ),
        ),
        migrations.AddConstraint(
            model_name="productopromocionplantilla",
            constraint=models.UniqueConstraint(
                fields=("producto", "promocion", "clave"),
                name="unique_producto_promocion_plantilla",
            ),
        ),
    ]
