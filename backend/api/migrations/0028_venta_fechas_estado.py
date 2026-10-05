from django.db import migrations, models


def backfill_fechas_estado(apps, schema_editor):
    Venta = apps.get_model("api", "Venta")
    for venta in Venta.objects.filter(estado="INSTALADO", instalado_en__isnull=True):
        venta.instalado_en = venta.actualizado
        venta.save(update_fields=["instalado_en"])
    for venta in Venta.objects.filter(estado="ANULADO", anulado_en__isnull=True):
        venta.anulado_en = venta.actualizado
        venta.save(update_fields=["anulado_en"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_venta_saf"),
    ]

    operations = [
        migrations.AddField(
            model_name="venta",
            name="anulado_en",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="venta",
            name="instalado_en",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_fechas_estado, migrations.RunPython.noop),
    ]
