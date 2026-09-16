from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_producto_tipo_cliente"),
    ]

    operations = [
        migrations.AddField(
            model_name="venta",
            name="psi",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="venta",
            name="siro",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="venta",
            name="numero_oportunidad",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="venta",
            name="oit",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="venta",
            name="cotizacion",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="venta",
            name="contrato",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="venta",
            name="numero_fijo",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="venta",
            name="numero_orden",
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
