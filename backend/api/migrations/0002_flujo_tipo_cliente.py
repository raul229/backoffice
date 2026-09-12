from django.db import migrations, models


def seed_flujos_por_tipo(apps, schema_editor):
    Flujo = apps.get_model("api", "Flujo")
    Paso = apps.get_model("api", "Paso")
    FlujoPaso = apps.get_model("api", "FlujoPaso")

    Flujo.objects.filter(tipo_cliente="").update(tipo_cliente="PERSONA")
    Flujo.objects.filter(nombre__icontains="ruc 10").update(tipo_cliente="PERSONA")

    if Flujo.objects.filter(tipo_cliente="EMPRESA").exists():
        return

    flujo = Flujo.objects.create(nombre="Flujo ruc 20", tipo_cliente="EMPRESA")
    pasos = [
        ("evaluacion comercial", "se evalua si el cliente califica al producto"),
        (
            "validacion ruc y vigencia de poder",
            "se valida el RUC 20 y la vigencia de poder del representante legal",
        ),
        ("ingreso venta", "se ingresa la venta al sistema one touch"),
        (
            "carfa de documentos al sistema",
            "se carga la documentacion al sistema one touche",
        ),
        (
            "agendamiento de tss",
            "el area de agendamiento se contacta para coordinar fecha de tss",
        ),
        (
            "agendamiento de instacion",
            "el area de agendamiento se contacta para coordinar fecha de instalacion",
        ),
    ]
    for orden, (nombre, descripcion) in enumerate(pasos, start=1):
        paso, _ = Paso.objects.get_or_create(
            nombre=nombre, defaults={"descripcion": descripcion}
        )
        FlujoPaso.objects.create(flujo=flujo, paso=paso, orden=orden)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="flujo",
            name="tipo_cliente",
            field=models.CharField(
                choices=[("PERSONA", "Persona Natural"), ("EMPRESA", "Persona Juridica")],
                default="PERSONA",
                max_length=20,
            ),
        ),
        migrations.RunPython(seed_flujos_por_tipo, migrations.RunPython.noop),
    ]
