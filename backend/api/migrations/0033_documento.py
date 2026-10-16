from django.db import migrations, models


def seed_documentos(apps, schema_editor):
    from api.contratos.datos_entel import CATALOGO_PLANTILLAS_ENTEL, MAPA_ENTEL_POR_ARCHIVO
    from api.contratos.mapas import mapa_a_json

    Documento = apps.get_model("api", "Documento")
    ProductoPlantilla = apps.get_model("api", "ProductoPlantilla")
    ProductoPromocionPlantilla = apps.get_model("api", "ProductoPromocionPlantilla")

    por_clave = {}
    for item in CATALOGO_PLANTILLAS_ENTEL:
        doc, _ = Documento.objects.get_or_create(
            clave=item["clave"],
            defaults={"mapa": mapa_a_json(MAPA_ENTEL_POR_ARCHIVO.get(item["archivo"], {}))},
        )
        if not doc.mapa:
            doc.mapa = mapa_a_json(MAPA_ENTEL_POR_ARCHIVO.get(item["archivo"], {}))
            doc.save(update_fields=["mapa"])
        por_clave[item["clave"]] = doc

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
