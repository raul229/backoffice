from django.db import migrations


def seed_mapas_excel(apps, schema_editor):
    from api.contratos.datos_entel import HC_ARCHIVO_POR_PLAN, HC_COORDS_POR_PLAN
    from api.contratos.mapas import campos_a_mapa

    Documento = apps.get_model("api", "Documento")
    plan_por_archivo = {archivo: plan for plan, archivo in HC_ARCHIVO_POR_PLAN.items()}
    for documento in Documento.objects.all():
        if documento.mapa:
            continue
        plan = plan_por_archivo.get(documento.archivo)
        if not plan:
            continue
        campos = [
            {
                "pagina": 0,
                "nombre": campo,
                "x": 0,
                "y": 0,
                "hoja": hoja,
                "celda": celda,
                "field": campo,
            }
            for campo, (hoja, celda) in HC_COORDS_POR_PLAN.get(plan, {}).items()
        ]
        if not campos:
            continue
        documento.mapa = campos_a_mapa(campos)
        documento.save(update_fields=["mapa"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0036_promocion_descuento_bono"),
    ]

    operations = [
        migrations.RunPython(seed_mapas_excel, migrations.RunPython.noop),
    ]
