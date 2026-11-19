from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0040_promocion_plazo_meses"),
    ]

    operations = [
        migrations.AlterField(
            model_name="direccion",
            name="numero",
            field=models.CharField(max_length=30),
        ),
    ]
