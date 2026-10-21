from django.db import migrations, models

CLAVES_INICIALES = (
    "internet-empresas",
    "pack-empresas",
    "bono-duplica",
    "promocion-30",
    "hc-empresas",
    "hc-pack",
    "creacion-oit",
    "tarifas-servicios",
    "correo-entel",
)

MAPAS_POR_CLAVE = {
    "internet-empresas": {
        "0": {
            "RAZON_SOCIAL": [20, 260, {"tamano": 9, "max_caracteres": 40}],
            "RUC": [50, 295, {}],
            "RRLL": [20, 350, {"max_caracteres": 40}],
            "DOCUMENTO_Y_DNI": [25, 400, {"transform": "doc_y_dni"}],
            "CORREO_RRLL": [25, 430, {}],
            "CELULAR_RRLL": [25, 460, {}],
            "DOMICILIO_INSTALACION": [20, 513, {"max_caracteres": 60, "tamano": 8}],
            "DOMICILIO_INSTALACION_2": [20, 563, {"max_caracteres": 60, "tamano": 8}],
            "VELOCIDADES": [330, 440, {"transform": "velocidades"}],
            "RUC_2": [110, 610, {"field": "RUC"}],
            "NOMBRE_PLAN": [140, 625, {"transform": "nombre_plan"}],
            "PROMOCION": [140, 640, {"field": "_PROMOCION"}],
            "CHECK_SERVICIO_NUEVO": [25, 665, {"value": "X"}],
            "RENTA_FIJA": [243, 712, {"field": "_RENTA_FIJA"}],
        },
        "2": {
            "RRLL": [195, 300, {"max_caracteres": 20}],
            "CARGO": [195, 330, {"value": "GERENTE GENERAL"}],
            "FECHA": [60, 345, {}],
            "HORA": [220, 345, {"value": "10 : 00 : 00"}],
        },
        "4": {
            "RRLL": [40, 510, {"max_caracteres": 20}],
            "DNI": [180, 510, {}],
            "CARGO": [260, 498, {"value": "GERENTE\nGENERAL"}],
            "CELULAR_RRLL": [350, 510, {"max_caracteres": 10}],
            "CORREO_RRLL": [436, 510, {"tamano": 9, "max_caracteres": 27}],
            "DIA_MES_ANIO": [200, 640, {"transform": "dia_mes_anio"}],
            "RRLL_2": [90, 710, {"field": "RRLL", "tamano": 10}],
            "CARGO_2": [100, 730, {"value": "GERENTE GENERAL"}],
        },
    },
    "pack-empresas": {
        "0": {
            "RENTA_FIJA": [525, 44, {"field": "_RENTA_FIJA"}],
            "RAZON_SOCIAL": [45, 285, {"tamano": 9, "max_caracteres": 40}],
            "RUC": [145, 315, {}],
            "RRLL": [45, 355, {"max_caracteres": 40}],
            "DOCUMENTO_Y_DNI": [45, 400, {"transform": "doc_y_dni"}],
            "CORREO_RRLL": [45, 430, {}],
            "DOMICILIO_INSTALACION": [45, 478, {"max_caracteres": 60, "tamano": 8}],
            "DOMICILIO_INSTALACION_2": [45, 530, {"max_caracteres": 60, "tamano": 8}],
            "NUMERO_FIJO": [115, 570, {}],
            "PRECIO_INTERNET_FIJO": [480, 435, {"value": "S/. 9.90"}],
            "PRECIO_TELEFONO_FIJO": [480, 445, {"transform": "precio_int_solo"}],
            "RUC_2": [145, 585, {"field": "RUC"}],
            "NOMBRE_PLAN": [178, 600, {"transform": "nombre_plan"}],
            "PROMOCION": [178, 615, {"field": "_PROMOCION"}],
            "CHECK_SERVICIO_NUEVO": [50, 645, {"value": "X"}],
        },
        "1": {
            "TOTAL_TARIFA_MENSUAL": [253, 188, {"value": "0"}],
            "LDN": [253, 292, {"value": "1"}],
            "LDI": [253, 310, {"value": "1"}],
            "TOTAL_TARIFA_UNICA": [253, 345, {"value": "0"}],
            "VELOCIDADES": [50, 525, {"transform": "velocidades"}],
        },
        "2": {
            "RRLL": [465, 410, {"max_caracteres": 20}],
            "CARGO": [465, 440, {"value": "GERENTE GENERAL"}],
            "FECHA": [370, 465, {}],
            "HORA": [495, 465, {"value": "10  00  00"}],
        },
        "4": {
            "RRLL": [40, 510, {"max_caracteres": 20}],
            "DNI": [180, 510, {}],
            "CARGO": [260, 498, {"value": "GERENTE\nGENERAL"}],
            "CELULAR_RRLL": [350, 510, {"max_caracteres": 10}],
            "CORREO_RRLL": [436, 510, {"tamano": 9, "max_caracteres": 27}],
            "DIA_MES_ANIO": [200, 640, {"transform": "dia_mes_anio"}],
            "RRLL_2": [90, 710, {"field": "RRLL", "tamano": 10}],
            "CARGO_2": [100, 730, {"value": "GERENTE GENERAL"}],
        },
    },
    "bono-duplica": {
        "0": {
            "FECHA": [120, 185, {}],
            "RUC": [230, 215, {}],
            "RAZON_SOCIAL": [225, 240, {"max_caracteres": 50, "tamano": 10}],
            "RRLL": [230, 260, {"tamano": 10}],
            "CELULAR_RRLL": [230, 280, {"tamano": 10}],
            "DOMICILIO_INSTALACION": [80, 340, {"max_caracteres": 70, "tamano": 12}],
        }
    },
    "promocion-30": {
        "0": {
            "FECHA": [120, 185, {}],
            "RUC": [230, 225, {}],
            "RAZON_SOCIAL": [225, 248, {"max_caracteres": 50, "tamano": 10}],
            "RRLL": [230, 270, {"tamano": 10}],
            "CELULAR_RRLL": [230, 290, {"tamano": 10}],
            "DOMICILIO_INSTALACION": [80, 350, {"max_caracteres": 70, "tamano": 12}],
            "DESCUENTO": [230, 430, {"transform": "descuento"}],
        }
    },
}


def seed_documentos(apps, schema_editor):
    Documento = apps.get_model("api", "Documento")
    ProductoPlantilla = apps.get_model("api", "ProductoPlantilla")
    ProductoPromocionPlantilla = apps.get_model("api", "ProductoPromocionPlantilla")

    por_clave = {}
    for clave in CLAVES_INICIALES:
        mapa = MAPAS_POR_CLAVE.get(clave, {})
        doc, _ = Documento.objects.get_or_create(
            clave=clave,
            defaults={"mapa": mapa},
        )
        if not doc.mapa:
            doc.mapa = mapa
            doc.save(update_fields=["mapa"])
        por_clave[clave] = doc

    for row in ProductoPlantilla.objects.all():
        doc = por_clave.get(row.clave)
        if doc is None:
            doc, _ = Documento.objects.get_or_create(clave=row.clave)
            por_clave[row.clave] = doc
        doc.productos.add(row.producto_id)

    for row in ProductoPromocionPlantilla.objects.all():
        doc = por_clave.get(row.clave)
        if doc is None:
            doc, _ = Documento.objects.get_or_create(clave=row.clave)
            por_clave[row.clave] = doc
        doc.productos.add(row.producto_id)
        doc.promociones.add(row.promocion_id)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0032_producto_promocion_plantillas"),
    ]

    operations = [
        migrations.CreateModel(
            name="Documento",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("clave", models.CharField(max_length=40, unique=True)),
                ("mapa", models.JSONField(blank=True, default=dict)),
                (
                    "productos",
                    models.ManyToManyField(
                        blank=True, related_name="documentos", to="api.producto"
                    ),
                ),
                (
                    "promociones",
                    models.ManyToManyField(
                        blank=True, related_name="documentos", to="api.promocion"
                    ),
                ),
            ],
        ),
        migrations.RunPython(seed_documentos, migrations.RunPython.noop),
        migrations.DeleteModel(name="ProductoPlantilla"),
        migrations.DeleteModel(name="ProductoPromocionPlantilla"),
    ]
