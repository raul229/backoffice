from django.db import migrations, models


def rellenar_plazos(apps, schema_editor):
    Promocion = apps.get_model("api", "Promocion")
    for promo in Promocion.objects.all():
        texto = f"{promo.nombre} {promo.descripcion}".lower()
        if "indefinid" in texto:
            promo.plazo = "INDEFINIDO"
        elif "3 m" in texto or "3m" in texto or "tres mes" in texto:
            promo.plazo = "3_MESES"
        else:
            promo.plazo = "6_MESES"
        promo.save(update_fields=["plazo"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0038_change_venta_promociones"),
    ]

    operations = [
        migrations.AddField(
            model_name="promocion",
            name="plazo",
            field=models.CharField(
                choices=[
                    ("3_MESES", "3 meses"),
                    ("6_MESES", "6 meses"),
                    ("INDEFINIDO", "Indefinido"),
                ],
                default="6_MESES",
                max_length=20,
            ),
        ),
        migrations.RunPython(rellenar_plazos, migrations.RunPython.noop),
    ]
