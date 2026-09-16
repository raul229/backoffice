from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0016_unique_direccion_cliente"),
    ]

    operations = [
        migrations.AddField(
            model_name="producto",
            name="tipo_cliente",
            field=models.CharField(
                choices=[
                    ("PERSONA", "Persona Natural"),
                    ("EMPRESA", "Persona Juridica"),
                ],
                default="PERSONA",
                max_length=20,
            ),
        ),
    ]
