from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_flujo_tipo_cliente"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ventapaso",
            name="flujo_paso",
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                to="api.flujopaso",
            ),
        ),
    ]
