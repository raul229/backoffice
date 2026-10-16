from rest_framework.exceptions import ValidationError

from .datos_entel import CLAVE_PLANTILLA_POR_ARCHIVO


def bytes_plantilla(archivo: str, requerida: bool = True) -> bytes | None:
    """Única fuente: archivos cargados en Configuración → Documentos (BD)."""
    from ..models import Documento, PlantillaContrato

    documento = Documento.objects.filter(archivo=archivo).exclude(archivo="").first()
    clave = documento.clave if documento else CLAVE_PLANTILLA_POR_ARCHIVO.get(archivo)
    registro = None
    if clave:
        registro = PlantillaContrato.objects.filter(clave=clave).only("contenido").first()
    if registro and registro.contenido:
        return bytes(registro.contenido)
    if not requerida:
        return None
    etiqueta = (documento.etiqueta if documento else None) or archivo
    raise ValidationError(
        {
            "detail": (
                f'Falta la plantilla “{etiqueta}”. '
                "Cárgala en Configuración → Documentos."
            )
        }
    )
