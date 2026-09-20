from django.db import migrations, models
from django.db.models import F
from django.utils import timezone


def copy_fecha_to_actualizado(apps, schema_editor):
    Venta = apps.get_model("api", "Venta")
    Venta.objects.update(actualizado=F("fecha"))


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0023_direccion_tienda_piso_galeria"),
    ]

    operations = [
        migrations.AddField(
            model_name="venta",
            name="actualizado",
            field=models.DateTimeField(default=timezone.now),
        ),
        migrations.RunPython(copy_fecha_to_actualizado, migrations.RunPython.noop),
    ]
