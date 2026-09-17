from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_reasignar_venta"),
    ]

    operations = [
        migrations.AddField(
            model_name="cliente",
            name="correo",
            field=models.EmailField(default="", max_length=254),
        ),
    ]
