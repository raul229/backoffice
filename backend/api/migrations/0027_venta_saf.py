from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0026_plantilla_contrato"),
    ]

    operations = [
        migrations.AddField(
            model_name="venta",
            name="saf",
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
