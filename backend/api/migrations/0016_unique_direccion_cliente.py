from collections import defaultdict

from django.db import migrations, models


def merge_exact_duplicates(apps, schema_editor):
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
            row.manzana,
            row.lote,
            row.interior,
            row.referencia,
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
        ("api", "0015_direccion_interior"),
    ]

    operations = [
        migrations.RunPython(merge_exact_duplicates, migrations.RunPython.noop),
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
                    "manzana",
                    "lote",
                    "interior",
                    "referencia",
                ),
                name="unique_direccion_cliente",
            ),
        ),
    ]
