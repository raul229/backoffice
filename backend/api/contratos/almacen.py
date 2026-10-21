from rest_framework.exceptions import ValidationError


def bytes_plantilla(archivo: str, requerida: bool = True) -> bytes | None:
    """Única fuente: archivos cargados en Configuración → Documentos (BD)."""
    from ..models import Documento, PlantillaContrato

    documento = Documento.objects.filter(archivo=archivo).exclude(archivo="").first()
    registro = None
    if documento:
        registro = PlantillaContrato.objects.filter(clave=documento.clave).only("contenido").first()
    if registro is None:
        registro = (
            PlantillaContrato.objects.filter(nombre_archivo=archivo).only("contenido").first()
        )
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
