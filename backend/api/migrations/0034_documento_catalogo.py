from django.db import migrations, models

CATALOGO_INICIAL = [
    {
        "clave": "internet-empresas",
        "archivo": "internet empresas.pdf",
        "etiqueta": "Contrato Internet Empresas",
        "descripcion": "PDF base del plan Internet Empresas.",
        "grupo": "Contratos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "pack-empresas",
        "archivo": "pack empresas.pdf",
        "etiqueta": "Contrato Pack Empresas",
        "descripcion": "PDF base del plan Pack Empresas.",
        "grupo": "Contratos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "bono-duplica",
        "archivo": "bono duplica.pdf",
        "etiqueta": "Anexo bono duplica velocidad",
        "descripcion": "Anexo de promoción por bono de velocidad.",
        "grupo": "Anexos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "promocion-30",
        "archivo": "promocion 30 x 6 meses.pdf",
        "etiqueta": "Anexo 30% por 6 meses",
        "descripcion": "Anexo de descuento del 30% por 6 meses.",
        "grupo": "Anexos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "hc-empresas",
        "archivo": "HC-EMPRESAS.xlsm",
        "etiqueta": "Hoja de calificación Internet Empresas",
        "descripcion": "Excel macro (.xlsm) de calificación para Internet Empresas.",
        "grupo": "Hojas de calificación",
        "acepta": [".xlsm"],
        "hojas": ["Formulario"],
        "requerida": False,
    },
    {
        "clave": "hc-pack",
        "archivo": "HC-PACK.xlsm",
        "etiqueta": "Hoja de calificación Pack Empresas",
        "descripcion": "Excel macro (.xlsm) de calificación para Pack Empresas.",
        "grupo": "Hojas de calificación",
        "acepta": [".xlsm"],
        "hojas": ["Formulario"],
        "requerida": False,
    },
    {
        "clave": "creacion-oit",
        "archivo": "plantilla_creacion_oit.xlsx",
        "etiqueta": "Creación OIT (Pack + fijo)",
        "descripcion": "Excel de creación de OIT cuando Pack Empresas incluye teléfono fijo.",
        "grupo": "Pack con fijo",
        "acepta": [".xlsx"],
        "hojas": ["CREACIÓN OIT"],
        "requerida": False,
    },
    {
        "clave": "tarifas-servicios",
        "archivo": "plantilla_tarifas_y_servicios.xlsm",
        "etiqueta": "Tarifas y servicios (Pack + fijo)",
        "descripcion": "Excel de tarifas y servicios para Pack Empresas con teléfono fijo.",
        "grupo": "Pack con fijo",
        "acepta": [".xlsm"],
        "hojas": ["SOLICITUD T Y S"],
        "requerida": False,
    },
    {
        "clave": "correo-entel",
        "archivo": "correo_contrato.eml",
        "etiqueta": "Plantilla de correo",
        "descripcion": "Correo .eml que se incluye en el ZIP con los PDFs adjuntos.",
        "grupo": "Correo",
        "acepta": [".eml"],
        "requerida": False,
    },
]


def fill_metadata(apps, schema_editor):
    Documento = apps.get_model("api", "Documento")
    por_clave = {item["clave"]: item for item in CATALOGO_INICIAL}
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
