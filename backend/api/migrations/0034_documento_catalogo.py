from django.db import migrations, models


def fill_metadata(apps, schema_editor):
    from api.contratos.datos_entel import CATALOGO_PLANTILLAS_ENTEL

    Documento = apps.get_model("api", "Documento")
    por_clave = {item["clave"]: item for item in CATALOGO_PLANTILLAS_ENTEL}
    for documento in Documento.objects.all():
        item = por_clave.get(documento.clave)
        if item is None:
            if not documento.etiqueta:
                documento.etiqueta = documento.clave
                documento.save(update_fields=["etiqueta"])
            continue
        documento.etiqueta = item["etiqueta"]
        documento.descripcion = item.get("descripcion") or ""
        documento.grupo = item.get("grupo") or ""
        documento.archivo = item.get("archivo") or ""
        documento.acepta = item.get("acepta") or []
        documento.hojas = item.get("hojas") or []
        documento.requerida = bool(item.get("requerida"))
        documento.save(
            update_fields=[
                "etiqueta",
                "descripcion",
                "grupo",
                "archivo",
                "acepta",
                "hojas",
                "requerida",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0033_documento"),
    ]

    operations = [
        migrations.AddField(
            model_name="documento",
            name="acepta",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="documento",
            name="archivo",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="documento",
            name="descripcion",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="documento",
            name="etiqueta",
            field=models.CharField(default="", max_length=120),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="documento",
            name="grupo",
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name="documento",
            name="hojas",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="documento",
            name="requerida",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(fill_metadata, migrations.RunPython.noop),
    ]
