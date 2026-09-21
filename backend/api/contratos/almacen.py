from pathlib import Path

from django.conf import settings
from rest_framework.exceptions import ValidationError

from .datos_entel import CLAVE_PLANTILLA_POR_ARCHIVO


def carpeta_plantillas_disco() -> Path | None:
    configurada = getattr(settings, "CONTRATOS_ENTEL", None)
    if configurada:
        ruta = Path(configurada)
        if ruta.is_dir():
            return ruta
    local = Path("/home/raul/Proyectos/Python/Contratos/CONTRATOS_ENTEL")
    if local.is_dir():
        return local
    return None


def bytes_plantilla(archivo: str, requerida: bool = True) -> bytes | None:
    from ..models import PlantillaContrato

    clave = CLAVE_PLANTILLA_POR_ARCHIVO.get(archivo)
    if clave:
        registro = PlantillaContrato.objects.filter(clave=clave).only("contenido").first()
        if registro and registro.contenido:
            return bytes(registro.contenido)
    disco = carpeta_plantillas_disco()
    if disco:
        ruta = disco / archivo
        if ruta.is_file():
            return ruta.read_bytes()
    if not requerida:
        return None
    raise ValidationError(
        {
            "detail": (
                f'Falta la plantilla "{archivo}". Cárgala en Configuración → Contratos.'
            )
        }
    )
