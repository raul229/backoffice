from rest_framework.exceptions import ValidationError

from .datos_entel import CLAVE_PLANTILLA_POR_ARCHIVO


def bytes_plantilla(archivo: str, requerida: bool = True) -> bytes | None:
    """Única fuente: plantillas cargadas en Configuración → Contratos (BD)."""
    from ..models import PlantillaContrato

    clave = CLAVE_PLANTILLA_POR_ARCHIVO.get(archivo)
    registro = None
    if clave:
        registro = PlantillaContrato.objects.filter(clave=clave).only("contenido").first()
    if registro and registro.contenido:
        return bytes(registro.contenido)
    if not requerida:
        return None
    etiqueta = archivo
    if clave:
        from .datos_entel import ITEM_PLANTILLA_POR_CLAVE

        etiqueta = ITEM_PLANTILLA_POR_CLAVE.get(clave, {}).get("etiqueta") or archivo
    raise ValidationError(
        {
            "detail": (
                f'Falta la plantilla “{etiqueta}”. '
                "Cárgala en Configuración → Contratos."
            )
        }
    )
