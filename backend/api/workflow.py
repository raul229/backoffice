from .models import EstadoPaso, EstadoVenta, FlujoPaso, Venta, VentaPaso


def sync_estado_venta_con_pasos(venta):
    if venta.estado == EstadoVenta.ANULADO:
        return venta
    pasos = list(venta.ventapaso_set.all())
    if not pasos:
        return venta
    if all(paso.estado == EstadoPaso.APROBADO for paso in pasos):
        siguiente = EstadoVenta.INSTALADO
    else:
        siguiente = EstadoVenta.EN_PROCESO
    if venta.estado != siguiente:
        venta.estado = siguiente
        venta.save(update_fields=["estado"])
    return venta


def sync_ventas_con_flujo(flujo, ventas=None):
    flujo_pasos = list(FlujoPaso.objects.filter(flujo=flujo).order_by("orden"))
    flujo_paso_ids = [paso.id for paso in flujo_pasos]
    queryset = ventas if ventas is not None else Venta.objects.filter(flujo=flujo)

    for venta in queryset:
        actuales = set(
            venta.ventapaso_set.values_list("flujo_paso_id", flat=True)
        )
        VentaPaso.objects.bulk_create(
            [
                VentaPaso(venta=venta, flujo_paso=flujo_paso)
                for flujo_paso in flujo_pasos
                if flujo_paso.id not in actuales
            ]
        )
        if flujo_paso_ids:
            venta.ventapaso_set.exclude(flujo_paso_id__in=flujo_paso_ids).delete()
        else:
            venta.ventapaso_set.all().delete()
        sync_estado_venta_con_pasos(venta)
    flujo_pasos = list(FlujoPaso.objects.filter(flujo=flujo).order_by("orden"))
    flujo_paso_ids = [paso.id for paso in flujo_pasos]
    queryset = ventas if ventas is not None else Venta.objects.filter(flujo=flujo)

    for venta in queryset:
        actuales = set(
            venta.ventapaso_set.values_list("flujo_paso_id", flat=True)
        )
        VentaPaso.objects.bulk_create(
            [
                VentaPaso(venta=venta, flujo_paso=flujo_paso)
                for flujo_paso in flujo_pasos
                if flujo_paso.id not in actuales
            ]
        )
        if flujo_paso_ids:
            venta.ventapaso_set.exclude(flujo_paso_id__in=flujo_paso_ids).delete()
        else:
            venta.ventapaso_set.all().delete()
