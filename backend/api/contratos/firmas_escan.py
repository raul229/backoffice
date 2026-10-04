"""Firmas manuscritas: overlay en zona de firma (coords en datos_entel)."""

from __future__ import annotations

import io
import statistics

import pymupdf
from PIL import Image, ImageChops, ImageFilter, ImageOps
from rest_framework.exceptions import ValidationError

from .datos_entel import (
    NOMBRE_PNG_POR_PAGINA,
    PAGINA_FIRMA_3,
    PAGINA_FIRMA_5,
    RECT_FIRMA_POR_PAGINA,
)

MAX_FIRMA_BYTES = 8 * 1024 * 1024
MAX_PROCESAR_EDGE = 1400
TIPOS_IMAGEN = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

# Umbrales: papel arrugado varía; la tinta suele ser claramente más oscura.
# Un poco agresivos para no dejar “velo” gris del papel en el PDF.
_DIFF_TRANSPARENTE = 14
_DIFF_OPACO = 42


def leer_firmas_request(request, plan: str) -> dict[int, bytes] | None:
    """
    Para Internet Empresas acepta firma_pagina_3 / firma_pagina_5 (opcionales por ahora).
    Otros planes: ignora firmas.
    """
    if plan != "Internet Empresas":
        return None

    firmas: dict[int, bytes] = {}
    archivo_3 = request.FILES.get("firma_pagina_3")
    archivo_5 = request.FILES.get("firma_pagina_5")
    if archivo_3:
        firmas[PAGINA_FIRMA_3] = _leer_imagen(archivo_3, "firma_pagina_3")
    if archivo_5:
        firmas[PAGINA_FIRMA_5] = _leer_imagen(archivo_5, "firma_pagina_5")
    return firmas or None


def _leer_imagen(archivo, campo: str) -> bytes:
    content_type = (getattr(archivo, "content_type", None) or "").lower()
    nombre = (getattr(archivo, "name", "") or "").lower()
    if content_type and content_type not in TIPOS_IMAGEN:
        if not any(nombre.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")):
            raise ValidationError({campo: "Sube una imagen (JPG, PNG o WEBP)."})
    if archivo.size and archivo.size > MAX_FIRMA_BYTES:
        raise ValidationError({campo: "La imagen no puede superar 8 MB."})
    data = archivo.read()
    if not data:
        raise ValidationError({campo: "La imagen está vacía."})
    if len(data) > MAX_FIRMA_BYTES:
        raise ValidationError({campo: "La imagen no puede superar 8 MB."})
    return data


def imagen_a_png(data: bytes) -> bytes:
    """Convierte la foto de firma a PNG con fondo transparente (solo tinta)."""
    try:
        return quitar_fondo_firma(data)
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError({"detail": f"No se pudo procesar la imagen de firma: {exc}"}) from exc


def quitar_fondo_firma(data: bytes) -> bytes:
    """
    Quita el papel/fondo de la foto con Pillow y deja solo el trazo de la firma.
    Usa diferencia frente a un fondo local (blur) para tolerar arrugas e iluminación.
    """
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as exc:
        raise ValidationError({"detail": f"No se pudo leer la imagen de firma: {exc}"}) from exc

    img = ImageOps.exif_transpose(img).convert("RGBA")
    img = _limitar_tamano(img, MAX_PROCESAR_EDGE)

    gray = ImageOps.autocontrast(img.convert("L"), cutoff=0.5)
    radio = max(10, min(gray.size) // 10)
    fondo_local = gray.filter(ImageFilter.GaussianBlur(radius=radio))
    # Lo más oscuro que el papel local ≈ tinta (ignora sombras suaves del papel).
    diferencia = ImageChops.subtract(fondo_local, gray)
    alpha = diferencia.point(_diff_a_alpha)

    # Refuerzo: píxeles muy claros respecto al papel estimado del borde → transparentes.
    br, bg, bb = _estimar_color_papel(img)
    alpha = _reforzar_alpha_por_color(img, alpha, (br, bg, bb))

    # Limpia semitransparencias del papel (velo) y refuerza el trazo.
    alpha = alpha.point(lambda p: 0 if p < 55 else (255 if p > 170 else int(40 + (p - 55) * 1.8)))

    out = img.copy()
    out.putalpha(alpha)
    out = _recortar_contenido(out)

    buf = io.BytesIO()
    out.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _diff_a_alpha(valor: int) -> int:
    if valor <= _DIFF_TRANSPARENTE:
        return 0
    if valor >= _DIFF_OPACO:
        return 255
    return int(255 * (valor - _DIFF_TRANSPARENTE) / (_DIFF_OPACO - _DIFF_TRANSPARENTE))


def _limitar_tamano(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    mayor = max(w, h)
    if mayor <= max_edge:
        return img
    escala = max_edge / mayor
    return img.resize((max(1, int(w * escala)), max(1, int(h * escala))), Image.Resampling.LANCZOS)


def _estimar_color_papel(img: Image.Image) -> tuple[int, int, int]:
    """Mediana RGB del borde (suele ser papel, no tinta)."""
    w, h = img.size
    px = img.load()
    muestras: list[tuple[int, int, int]] = []
    paso = max(1, min(w, h) // 50)
    for x in range(0, w, paso):
        muestras.append(px[x, 0][:3])
        muestras.append(px[x, h - 1][:3])
    for y in range(0, h, paso):
        muestras.append(px[0, y][:3])
        muestras.append(px[w - 1, y][:3])
    if not muestras:
        return (255, 255, 255)
    return (
        int(statistics.median(c[0] for c in muestras)),
        int(statistics.median(c[1] for c in muestras)),
        int(statistics.median(c[2] for c in muestras)),
    )


def _reforzar_alpha_por_color(
    img: Image.Image,
    alpha: Image.Image,
    papel: tuple[int, int, int],
) -> Image.Image:
    """
    Si un píxel está muy cerca del color del papel, fuerza transparencia
    (limpia tintes azulados / grises del fondo).
    """
    pr, pg, pb = papel
    px = img.load()
    a = alpha.load()
    w, h = img.size
    # Distancia RGB al papel: bajo → papel; alto → tinta o mancha.
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            dist2 = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
            if dist2 < 28**2:
                # Casi papel: apagar alpha (más agresivo cuanto más cerca).
                factor = dist2 / (28**2)
                a[x, y] = int(a[x, y] * factor * factor)
            # Tinta azul/oscura lejos del papel: mantener o subir un poco
            elif a[x, y] > 0 and dist2 > 55**2:
                a[x, y] = min(255, int(a[x, y] * 1.15))
    return alpha


def _recortar_contenido(img: Image.Image, padding: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def firmas_a_png(firmas: dict[int, bytes]) -> dict[int, bytes]:
    return {indice: imagen_a_png(data) for indice, data in firmas.items()}


def insertar_firmas_en_pdf(pdf: pymupdf.Document, firmas_png: dict[int, bytes]) -> None:
    """Pega cada PNG (con transparencia) en el recuadro de firma."""
    for indice, png in firmas_png.items():
        if indice < 0 or indice >= len(pdf):
            raise ValidationError(
                {
                    "detail": (
                        f"El PDF no tiene la página de firma requerida (índice {indice}, "
                        f"tiene {len(pdf)})."
                    )
                }
            )
        caja = RECT_FIRMA_POR_PAGINA.get(indice)
        if caja is None:
            raise ValidationError({"detail": f"No hay zona de firma configurada (índice {indice})."})
        page = pdf[indice]
        page.insert_image(pymupdf.Rect(*caja), stream=png, keep_proportion=True)
