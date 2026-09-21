from io import BytesIO
from pathlib import Path

import pymupdf
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from openpyxl import load_workbook
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .contratos.datos_entel import (
    CATALOGO_PLANTILLAS_ENTEL,
    ITEM_PLANTILLA_POR_CLAVE,
    MAPA_ENTEL_POR_ARCHIVO,
)
from .models import PlantillaContrato

MAX_PLANTILLA = 15 * 1024 * 1024


def _require_perm(user, perm, mensaje):
    if user.is_superuser or user.has_perm(perm):
        return
    raise PermissionDenied(mensaje)


def _item(clave: str) -> dict:
    item = ITEM_PLANTILLA_POR_CLAVE.get(clave)
    if item is None:
        raise NotFound("Plantilla desconocida.")
    return item


def _serialize(item: dict, registro: PlantillaContrato | None) -> dict:
    data = {
        **item,
        "cargada": False,
        "tamano": 0,
        "nombre_archivo": "",
        "actualizado": None,
        "actualizado_por": None,
    }
    if registro is None:
        return data
    usuario = registro.actualizado_por
    data.update(
        {
            "cargada": True,
            "tamano": registro.tamano,
            "nombre_archivo": registro.nombre_archivo,
            "actualizado": registro.actualizado.isoformat() if registro.actualizado else None,
            "actualizado_por": (
                {
                    "id": usuario.id,
                    "username": usuario.username,
                    "first_name": usuario.first_name,
                    "last_name": usuario.last_name,
                }
                if usuario
                else None
            ),
        }
    )
    return data


def _validar_archivo(item: dict, nombre: str, contenido: bytes) -> None:
    extension = Path(nombre).suffix.lower()
    if extension not in item["acepta"]:
        acepta = ", ".join(item["acepta"])
        raise ValidationError({"archivo": f"Usa un archivo {acepta}."})
    if len(contenido) > MAX_PLANTILLA:
        raise ValidationError({"archivo": "El archivo no puede superar 15 MB."})
    if not contenido:
        raise ValidationError({"archivo": "El archivo está vacío."})

    if extension == ".pdf":
        if not contenido.startswith(b"%PDF"):
            raise ValidationError({"archivo": "El archivo no es un PDF válido."})
        pdf = pymupdf.open(stream=contenido, filetype="pdf")
        try:
            needed = max(MAPA_ENTEL_POR_ARCHIVO.get(item["archivo"], {0: None})) + 1
            if len(pdf) < needed:
                raise ValidationError(
                    {
                        "archivo": (
                            f'Este PDF tiene {len(pdf)} página(s); se esperan al menos {needed} '
                            f'para “{item["etiqueta"]}”.'
                        )
                    }
                )
        finally:
            pdf.close()
        return

    if extension == ".xlsm":
        if contenido[:2] != b"PK":
            raise ValidationError({"archivo": "El archivo no es un Excel .xlsm válido."})
        try:
            wb = load_workbook(BytesIO(contenido), keep_vba=True, read_only=True, data_only=True)
        except Exception as exc:
            raise ValidationError({"archivo": "No se pudo leer la hoja de calificación."}) from exc
        try:
            if "Formulario" not in wb.sheetnames:
                raise ValidationError({"archivo": 'Falta la hoja "Formulario" en el Excel.'})
        finally:
            wb.close()
        return

    if extension == ".eml":
        try:
            texto = contenido.decode("utf-8")
        except UnicodeDecodeError:
            texto = contenido.decode("latin-1")
        if "subject:" not in texto.lower():
            raise ValidationError({"archivo": "El correo debe incluir un campo subject."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plantillas_contrato(request):
    _require_perm(
        request.user,
        "api.view_plantillacontrato",
        "No tienes permiso para ver las plantillas de contrato.",
    )
    registros = {
        item.clave: item
        for item in PlantillaContrato.objects.select_related("actualizado_por")
    }
    return Response([_serialize(item, registros.get(item["clave"])) for item in CATALOGO_PLANTILLAS_ENTEL])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def subir_plantilla_contrato(request, clave):
    if not request.user.is_superuser and not (
        request.user.has_perm("api.change_plantillacontrato")
        or request.user.has_perm("api.add_plantillacontrato")
    ):
        raise PermissionDenied("No tienes permiso para cargar plantillas de contrato.")
    item = _item(clave)
    archivo = request.FILES.get("archivo")
    if archivo is None:
        raise ValidationError({"archivo": "Selecciona un archivo."})
    contenido = archivo.read()
    _validar_archivo(item, archivo.name, contenido)
    registro, _created = PlantillaContrato.objects.update_or_create(
        clave=clave,
        defaults={
            "nombre_archivo": Path(archivo.name).name[:200],
            "content_type": (archivo.content_type or "")[:120],
            "tamano": len(contenido),
            "contenido": contenido,
            "actualizado_por": request.user,
        },
    )
    return Response(_serialize(item, registro))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def descargar_plantilla_contrato(request, clave):
    _require_perm(
        request.user,
        "api.view_plantillacontrato",
        "No tienes permiso para ver las plantillas de contrato.",
    )
    item = _item(clave)
    registro = PlantillaContrato.objects.filter(clave=clave).first()
    if registro is None:
        raise NotFound("Aún no hay un archivo cargado para esta plantilla.")
    response = HttpResponse(
        bytes(registro.contenido),
        content_type=registro.content_type or "application/octet-stream",
    )
    response["Content-Disposition"] = content_disposition_header(
        True, registro.nombre_archivo or item["archivo"]
    )
    return response
