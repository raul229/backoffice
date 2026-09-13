from django.db import migrations


def reparar_pasos_de_ventas(apps, schema_editor):
    Flujo = apps.get_model("api", "Flujo")
    FlujoPaso = apps.get_model("api", "FlujoPaso")
    Venta = apps.get_model("api", "Venta")
    VentaPaso = apps.get_model("api", "VentaPaso")

    for flujo in Flujo.objects.all():
        flujo_pasos = list(FlujoPaso.objects.filter(flujo=flujo).order_by("orden"))
        flujo_paso_ids = [paso.id for paso in flujo_pasos]
        for venta in Venta.objects.filter(flujo=flujo):
            actuales = set(
                VentaPaso.objects.filter(venta=venta).values_list(
                    "flujo_paso_id", flat=True
                )
            )
            VentaPaso.objects.bulk_create(
                [
                    VentaPaso(venta=venta, flujo_paso=flujo_paso)
                    for flujo_paso in flujo_pasos
                    if flujo_paso.id not in actuales
                ]
            )
            if flujo_paso_ids:
                VentaPaso.objects.filter(venta=venta).exclude(
                    flujo_paso_id__in=flujo_paso_ids
                ).delete()
            else:
                VentaPaso.objects.filter(venta=venta).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_ventapaso_flujo_paso_cascade"),
    ]

    operations = [
        migrations.RunPython(reparar_pasos_de_ventas, migrations.RunPython.noop),
    ]
