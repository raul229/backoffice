from .mapas import json_a_mapa


def documentos_para_venta(venta):
    from ..models import Documento

    promo_ids = set(venta.promociones.values_list("id", flat=True))
    producto_id = venta.producto_id
    elegidos = []
    for doc in Documento.objects.prefetch_related("productos", "promociones"):
        prod_ids = set(doc.productos.values_list("id", flat=True))
        promo_doc = set(doc.promociones.values_list("id", flat=True))
        if not prod_ids and not promo_doc:
            continue
        if prod_ids and producto_id not in prod_ids:
            continue
        if promo_doc and promo_ids.isdisjoint(promo_doc):
            continue
        elegidos.append(doc)
    return elegidos


def archivos_pdf_para_venta(venta, plan: str = "", velocidad: int = 0, promocion: str = "") -> list[tuple[str, dict | None]]:
    archivos = []
    vistos = set()
    for doc in documentos_para_venta(venta):
        acepta = doc.acepta or []
        if ".pdf" not in acepta:
            continue
        nombre = (doc.archivo or "").strip()
        if not nombre or nombre in vistos:
            continue
        vistos.add(nombre)
        mapa = json_a_mapa(doc.mapa) if doc.mapa else None
        archivos.append((nombre, mapa))
    return archivos
