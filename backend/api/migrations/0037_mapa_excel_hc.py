from django.db import migrations


def seed_mapas_excel(apps, schema_editor):
    from api.contratos.mapas import campos_a_mapa

    hc_archivo_por_plan = {
        "Internet Empresas": "HC-EMPRESAS.xlsm",
        "Pack Empresas": "HC-PACK.xlsm",
    }
    hc_coords_por_plan = {
        "Internet Empresas": {
            "RUC": ("Formulario", "F7"),
            "RAZON_SOCIAL": ("Formulario", "P7"),
            "SIRO": ("Formulario", "P8"),
            "NO_OPORTUNIDAD": ("Formulario", "P9"),
            "NRO_PSI": ("Formulario", "P11"),
        },
        "Pack Empresas": {
            "RUC": ("Formulario", "F7"),
            "RAZON_SOCIAL": ("Formulario", "P7"),
            "SIRO": ("Formulario", "P8"),
            "NO_OPORTUNIDAD": ("Formulario", "P9"),
            "OIT": ("Formulario", "G65"),
            "COTIZACION": ("Formulario", "F9"),
            "CONTRATO": ("Formulario", "F10"),
        },
    }

    Documento = apps.get_model("api", "Documento")
    plan_por_archivo = {archivo: plan for plan, archivo in hc_archivo_por_plan.items()}
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
            for campo, (hoja, celda) in hc_coords_por_plan.get(plan, {}).items()
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
