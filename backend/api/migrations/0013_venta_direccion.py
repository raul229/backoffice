from django.db import migrations, models
import django.db.models.deletion


def backfill_venta_direccion(apps, schema_editor):
    Venta = apps.get_model("api", "Venta")
    Direccion = apps.get_model("api", "Direccion")
    ventas = list(Venta.objects.filter(direccion_id__isnull=True).order_by("id"))
    dirs_by_cliente = {}
    assigned = {}
    for venta in ventas:
        if venta.cliente_id not in dirs_by_cliente:
            dirs_by_cliente[venta.cliente_id] = list(
                Direccion.objects.filter(cliente_id=venta.cliente_id).order_by("id")
            )
            assigned[venta.cliente_id] = 0
        dirs = dirs_by_cliente[venta.cliente_id]
        if not dirs:
            continue
        index = assigned[venta.cliente_id]
        direccion = dirs[index] if index < len(dirs) else dirs[-1]
        assigned[venta.cliente_id] = index + 1
        venta.direccion_id = direccion.id
        venta.save(update_fields=["direccion"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_delete_direccion_perm"),
    ]

    operations = [
        migrations.AddField(
            model_name="venta",
            name="direccion",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="ventas",
                to="api.direccion",
            ),
        ),
        migrations.RunPython(backfill_venta_direccion, migrations.RunPython.noop),
    ]
