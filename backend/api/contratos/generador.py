import io
import shutil
import tempfile
import zipfile
from pathlib import Path

import pymupdf
from django.conf import settings
from openpyxl import load_workbook
from rest_framework.exceptions import ValidationError

from .almacen import bytes_plantilla
from .datos_entel import (
    ANEXOS_POR_COMBINACION,
    ARCHIVOS_BASE_POR_PLAN,
    HC_ARCHIVO_POR_PLAN,
    HC_COORDS_POR_PLAN,
    MAPA_ENTEL_POR_ARCHIVO,
    PLANES_ENTEL,
    PLANTILLA_CORREO_ENTEL,
)
from .mapeo import (
    contexto_desde_venta,
    nombre_zip_contrato,
    parsear_direccion_contrato,
    parsear_fecha_contrato,
)
from .utils import dividir_texto, generar_eml


def generar_zip_entel(venta, fecha=None, direccion=None) -> tuple[bytes, str]:
    contexto, plan, velocidad, promocion = contexto_desde_venta(
        venta,
        fecha=parsear_fecha_contrato(fecha),
        direccion=parsear_direccion_contrato(direccion),
    )
    tarifas = PLANES_ENTEL[plan][velocidad]
    datos_plan = {
        "_PROMOCION": promocion,
        "_RENTA_FIJA": str(tarifas["renta"]),
        "_DESCUENTO": str(tarifas["descuento"]),
        "_NOMBRE_PLAN": plan,
        "_VELOCIDAD": velocidad,
        "PROMOCION": promocion,
        "RENTA_FIJA": str(tarifas["renta"]),
        "DESCUENTO": str(tarifas["descuento"]),
        "NOMBRE_PLAN": plan,
        "VELOCIDAD": velocidad,
        **tarifas,
    }
    with tempfile.TemporaryDirectory() as tmp:
        raiz = Path(tmp)
        origenes = raiz / "origen"
        destino = raiz / "salida"
        origenes.mkdir()
        destino.mkdir()
        pdfs = _materializar_pdfs(origenes, plan, velocidad, promocion)
        for ruta in pdfs:
            _llenar_pdf(ruta, destino / ruta.name, contexto, datos_plan)
        hc_nombre = HC_ARCHIVO_POR_PLAN[plan]
        hc_bytes = bytes_plantilla(hc_nombre, requerida=False)
        if hc_bytes:
            origen_hc = origenes / hc_nombre
            origen_hc.write_bytes(hc_bytes)
            _llenar_hc(origen_hc, destino / hc_nombre, contexto, HC_COORDS_POR_PLAN.get(plan, {}))
        eml_bytes = bytes_plantilla(PLANTILLA_CORREO_ENTEL, requerida=False)
        if eml_bytes:
            extra = {
                "CORREO_BACKOFFICE": getattr(settings, "CORREO_BACKOFFICE", "") or "",
                "CORREO_GERENTE": getattr(settings, "CORREO_GERENTE", "") or "",
                "CORREOS_ADICIONALES": getattr(settings, "CORREOS_ADICIONALES", "") or "",
            }
            origen_eml = origenes / PLANTILLA_CORREO_ENTEL
            origen_eml.write_bytes(eml_bytes)
            adjuntos = [destino / ruta.name for ruta in pdfs]
            generar_eml(origen_eml, {**contexto, **datos_plan, **extra}, adjuntos, destino)
        return _zip_carpeta(destino), nombre_zip_contrato(
            contexto["RAZON_SOCIAL"], contexto["RUC"]
        )


def _materializar_pdfs(origenes: Path, plan: str, velocidad: int, promocion: str) -> list[Path]:
    nombres = [ARCHIVOS_BASE_POR_PLAN[plan], *ANEXOS_POR_COMBINACION.get((plan, velocidad, promocion), [])]
    rutas = []
    for nombre in nombres:
        ruta = origenes / nombre
        ruta.write_bytes(bytes_plantilla(nombre))
        rutas.append(ruta)
    return rutas


def _valor(campo: str, opciones: dict, contexto: dict, datos_plan: dict):
    if "value" in opciones:
        return opciones["value"]
    if "transform" in opciones:
        return _transform(opciones["transform"], contexto, datos_plan)
    nombre = opciones.get("field", campo)
    if nombre in contexto:
        return contexto[nombre]
    if nombre in datos_plan:
        return datos_plan[nombre]
    return None


def _transform(nombre: str, contexto: dict, datos_plan: dict) -> str | None:
    if nombre == "doc_y_dni":
        return f"{contexto.get('TIPO_DOCUMENTO_RRLL', '')} {contexto.get('DNI', '')}".strip()
    if nombre == "velocidades":
        v = int(datos_plan.get("_VELOCIDAD") or 0)
        return f"{v}                {int(v * 0.7)}               {v}             {int(v * 0.7)}"
    if nombre == "nombre_plan":
        return f"{datos_plan.get('_NOMBRE_PLAN')} {datos_plan.get('_VELOCIDAD')}"
    if nombre == "dia_mes_anio":
        return (
            f"{contexto.get('DIA', '')}                                    "
            f"{contexto.get('NOMBRE_MES', '')}                            "
            f"{contexto.get('ANIO', '')}"
        )
    if nombre == "descuento":
        return f"S/. {datos_plan.get('_DESCUENTO')}"
    if nombre == "precio_int_solo":
        renta = float(str(datos_plan.get("_RENTA_FIJA", "0")).replace("S/.", "").strip())
        return f"S/. {renta - 9.9:.2f}"
    return None


def _llenar_pdf(origen: Path, destino: Path, contexto: dict, datos_plan: dict) -> None:
    pdf = pymupdf.open(origen)
    try:
        paginas = MAPA_ENTEL_POR_ARCHIVO.get(origen.name, {})
        for num_pagina, coords in paginas.items():
            if num_pagina >= len(pdf):
                raise ValidationError(
                    {
                        "detail": (
                            f"El PDF {origen.name} no tiene la página {num_pagina} "
                            f"(tiene {len(pdf)})."
                        )
                    }
                )
            pagina = pdf[num_pagina]
            for campo, (x, y, opciones) in coords.items():
                valor = _valor(campo, opciones, contexto, datos_plan)
                if valor in (None, ""):
                    continue
                tamano = opciones.get("tamano", 12)
                max_caracteres = opciones.get("max_caracteres")
                if max_caracteres:
                    texto, lineas = dividir_texto(str(valor), max_caracteres)
                    y_inicial = y - (tamano * lineas)
                else:
                    texto = str(valor)
                    y_inicial = y
                pagina.insert_text((x, y_inicial), texto, fontsize=tamano)
        pdf.save(str(destino))
    finally:
        pdf.close()


def _llenar_hc(origen: Path, destino: Path, contexto: dict, coords: dict) -> None:
    shutil.copy(origen, destino)
    wb = load_workbook(destino, keep_vba=True)
    for campo, (hoja, celda) in coords.items():
        valor = contexto.get(campo)
        if valor in (None, ""):
            continue
        wb[hoja][celda] = valor
    for nombre in wb.sheetnames:
        wb[nombre].sheet_state = "visible" if nombre == "Formulario" else "hidden"
    wb.save(destino)


def _zip_carpeta(carpeta: Path) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archivo:
        for ruta in sorted(carpeta.iterdir()):
            if ruta.is_file():
                archivo.write(ruta, ruta.name)
    return buffer.getvalue()
