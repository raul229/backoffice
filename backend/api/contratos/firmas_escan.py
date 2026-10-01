"""Helpers para validar y aplicar firmas escaneadas en contratos Internet Empresas."""

from __future__ import annotations

import pymupdf
from rest_framework.exceptions import ValidationError

# Índices físicos en internet empresas.pdf (páginas lógicas 3 y 5).
PAGINA_FIRMA_3 = 2
PAGINA_FIRMA_5 = 4
MAX_FIRMA_BYTES = 10 * 1024 * 1024
TIPOS_IMAGEN = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


def leer_firmas_request(request, plan: str) -> dict[int, bytes] | None:
    """
    Para Internet Empresas exige firma_pagina_3 y firma_pagina_5.
    Otros planes: ignora firmas (MVP).
    """
    if plan != "Internet Empresas":
        return None

    archivo_3 = request.FILES.get("firma_pagina_3")
    archivo_5 = request.FILES.get("firma_pagina_5")
    if not archivo_3 or not archivo_5:
        raise ValidationError(
            {
                "detail": (
                    "Para Internet Empresas debes escanear las hojas de firma "
                    "(páginas 3 y 5) desde el celular."
                )
            }
        )
    return {
        PAGINA_FIRMA_3: _leer_imagen(archivo_3, "firma_pagina_3"),
        PAGINA_FIRMA_5: _leer_imagen(archivo_5, "firma_pagina_5"),
    }


def _leer_imagen(archivo, campo: str) -> bytes:
    content_type = (getattr(archivo, "content_type", None) or "").lower()
    nombre = (getattr(archivo, "name", "") or "").lower()
    if content_type and content_type not in TIPOS_IMAGEN:
        if not any(nombre.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")):
            raise ValidationError({campo: "Sube una imagen (JPG, PNG o WEBP)."})
    if archivo.size and archivo.size > MAX_FIRMA_BYTES:
        raise ValidationError({campo: "La imagen no puede superar 10 MB."})
    data = archivo.read()
    if not data:
        raise ValidationError({campo: "La imagen está vacía."})
    if len(data) > MAX_FIRMA_BYTES:
        raise ValidationError({campo: "La imagen no puede superar 10 MB."})
    return data


def reemplazar_paginas_con_imagenes(pdf: pymupdf.Document, firmas: dict[int, bytes]) -> set[int]:
    """Reemplaza páginas completas por imágenes. Devuelve los índices reemplazados."""
    reemplazadas: set[int] = set()
    for indice, imagen in firmas.items():
        if indice < 0 or indice >= len(pdf):
            raise ValidationError(
                {
                    "detail": (
                        f"El PDF no tiene la página de firma requerida (índice {indice}, "
                        f"tiene {len(pdf)})."
                    )
                }
            )
        page = pdf[indice]
        rect = page.rect
        page.clean_contents()
        page.insert_image(rect, stream=imagen, keep_proportion=False)
        reemplazadas.add(indice)
    return reemplazadas
