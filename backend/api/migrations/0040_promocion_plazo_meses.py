from django.db import migrations, models


def copiar_plazos(apps, schema_editor):
    Promocion = apps.get_model("api", "Promocion")
    por_clave = {"3_MESES": 3, "6_MESES": 6, "INDEFINIDO": None}
    for promo in Promocion.objects.all():
        promo.plazo_meses = por_clave.get(promo.plazo, 6)
        promo.save(update_fields=["plazo_meses"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_promocion_plazo"),
    ]

    operations = [
        migrations.AddField(
            model_name="promocion",
            name="plazo_meses",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(copiar_plazos, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="promocion",
            name="plazo",
        ),
    ]
