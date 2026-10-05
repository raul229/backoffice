"""Marcas de tiempo al cambiar el estado de una venta (reportes)."""

from django.utils import timezone

from .models import EstadoVenta


def persistir_cambio_estado(venta, estado_anterior: str) -> None:
    """Graba instalado_en / anulado_en la primera vez que entra en ese estado."""
    if venta.estado == estado_anterior:
        return
    ahora = timezone.now()
    update_fields = ["estado", "actualizado"]
    if venta.estado == EstadoVenta.INSTALADO and not venta.instalado_en:
        venta.instalado_en = ahora
        update_fields.append("instalado_en")
    if venta.estado == EstadoVenta.ANULADO and not venta.anulado_en:
        venta.anulado_en = ahora
        update_fields.append("anulado_en")
    venta.save(update_fields=update_fields)
