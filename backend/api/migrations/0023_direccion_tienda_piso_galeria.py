from collections import defaultdict

from django.db import migrations, models


def merge_direccion_duplicates(apps, schema_editor):
    Direccion = apps.get_model("api", "Direccion")
    Venta = apps.get_model("api", "Venta")
    groups = defaultdict(list)
    for row in Direccion.objects.order_by("id"):
        key = (
            row.cliente_id,
            row.tipo,
            row.direccion,
            row.numero,
            row.distrito,
            row.urbanizacion,
            row.interior,
            row.tienda,
            row.piso,
            row.galeria,
        )
        groups[key].append(row)
    for rows in groups.values():
        if len(rows) < 2:
            continue
        keep = rows[0]
        extras = [row.id for row in rows[1:]]
        Venta.objects.filter(direccion_id__in=extras).update(direccion_id=keep.id)
        Direccion.objects.filter(id__in=extras).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0022_cliente_correo"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="direccion",
            name="unique_direccion_cliente",
        ),
        migrations.RemoveField(
            model_name="direccion",
            name="lote",
        ),
        migrations.RemoveField(
            model_name="direccion",
            name="manzana",
        ),
        migrations.AddField(
            model_name="direccion",
            name="galeria",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="direccion",
            name="piso",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="direccion",
            name="tienda",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.RunPython(merge_direccion_duplicates, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="direccion",
            constraint=models.UniqueConstraint(
                fields=(
                    "cliente",
                    "tipo",
                    "direccion",
                    "numero",
                    "distrito",
                    "urbanizacion",
                    "interior",
                    "tienda",
                    "piso",
                    "galeria",
                ),
                name="unique_direccion_cliente",
            ),
        ),
    ]
