from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0034_documento_catalogo"),
    ]

    operations = [
        migrations.AddField(
            model_name="empresa",
            name="domicilio_fiscal",
            field=models.CharField(blank=True, max_length=400),
        ),
    ]
