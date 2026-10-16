from decimal import Decimal

from django.db import migrations, models


def rellenar_beneficios(apps, schema_editor):
    Promocion = apps.get_model("api", "Promocion")
    for promo in Promocion.objects.all():
        texto = f"{promo.nombre} {promo.descripcion}".lower()
        if "20" in texto:
            promo.descuento_porcentaje = Decimal("20")
        elif "30" in texto:
            promo.descuento_porcentaje = Decimal("30")
        if "duplica" in texto:
            promo.bono_velocidad = "DUPLICA"
        elif "300" in texto:
            promo.bono_velocidad = "FIJO"
            promo.bono_mbps = 300
        elif "bono" in texto:
            promo.bono_velocidad = "DUPLICA"
        promo.save(update_fields=["descuento_porcentaje", "bono_velocidad", "bono_mbps"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0035_empresa_domicilio_fiscal"),
    ]

    operations = [
            migrations.AddField(
                model_name="promocion",
                name="descuento_porcentaje",
                field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
            ),
            migrations.AddField(
                model_name="promocion",
                name="bono_velocidad",
                field=models.CharField(
                    choices=[
                        ("NINGUNO", "Sin bono"),
                        ("DUPLICA", "Duplica la velocidad"),
                        ("FIJO", "Mbps adicionales fijos"),
                    ],
                    default="NINGUNO",
                    max_length=20,
                ),
            ),
            migrations.AddField(
                model_name="promocion",
                name="bono_mbps",
                field=models.PositiveIntegerField(default=0),
            ),
            migrations.RunPython(rellenar_beneficios, migrations.RunPython.noop),
    ]
