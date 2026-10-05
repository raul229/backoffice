"""Agregados de ventas para la vista Reportes."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EstadoVenta, Venta

User = get_user_model()
LIMA = ZoneInfo("America/Lima")


def _puede_ver_todas(user) -> bool:
    return user.is_superuser or user.has_perm("api.view_all_ventas")


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def _rango_mes(ref: date) -> tuple[datetime, datetime]:
    """[inicio, fin) en Lima para el mes de ref."""
    inicio = datetime(ref.year, ref.month, 1, 0, 0, 0, tzinfo=LIMA)
    if ref.month == 12:
        fin = datetime(ref.year + 1, 1, 1, 0, 0, 0, tzinfo=LIMA)
    else:
        fin = datetime(ref.year, ref.month + 1, 1, 0, 0, 0, tzinfo=LIMA)
    return inicio, fin


def _periodo_desde_request(request) -> tuple[datetime, datetime, date, date]:
    mes = request.query_params.get("mes")
    desde = _parse_date(request.query_params.get("desde"))
    hasta = _parse_date(request.query_params.get("hasta"))
    if mes:
        year_s, month_s = mes.split("-", 1)
        ref = date(int(year_s), int(month_s), 1)
        return (*_rango_mes(ref), ref, ref)
    if desde and hasta:
        inicio = datetime(desde.year, desde.month, desde.day, 0, 0, 0, tzinfo=LIMA)
        fin = datetime(hasta.year, hasta.month, hasta.day, 23, 59, 59, tzinfo=LIMA) + timedelta(
            seconds=1
        )
        return inicio, fin, desde, hasta
    hoy = timezone.now().astimezone(LIMA).date()
    ref = date(hoy.year, hoy.month, 1)
    inicio, fin = _rango_mes(ref)
    ultimo = date(hoy.year, hoy.month, monthrange(hoy.year, hoy.month)[1])
    return inicio, fin, ref, ultimo


def _mes_anterior(ref: date) -> date:
    if ref.month == 1:
        return date(ref.year - 1, 12, 1)
    return date(ref.year, ref.month - 1, 1)


def _delta_pct(actual: int, anterior: int) -> int:
    if not anterior:
        return 100 if actual else 0
    return round(((actual - anterior) / anterior) * 100)


def _ventas_visibles(user):
    qs = Venta.objects.all()
    if _puede_ver_todas(user):
        return qs
    return qs.filter(creado_por=user)


def _aplicar_filtros(qs, request, user):
    estados = request.query_params.getlist("estado")
    if estados:
        qs = qs.filter(estado__in=estados)

    creado_por = request.query_params.get("creado_por")
    if creado_por:
        if not _puede_ver_todas(user):
            if str(user.pk) != str(creado_por):
                return qs.none()
        else:
            qs = qs.filter(creado_por_id=creado_por)

    flujo_pasos = request.query_params.getlist("flujo_paso")
    if flujo_pasos:
        qs = qs.filter(ventapaso__flujo_paso_id__in=flujo_pasos).distinct()

    paso_estados = request.query_params.getlist("paso_estado")
    if paso_estados:
        qs = qs.filter(ventapaso__estado__in=paso_estados).distinct()

    return qs


def _conteo_instaladas(qs, inicio: datetime, fin: datetime) -> int:
    return qs.filter(instalado_en__gte=inicio, instalado_en__lt=fin).count()


def _conteo_anuladas(qs, inicio: datetime, fin: datetime) -> int:
    return qs.filter(anulado_en__gte=inicio, anulado_en__lt=fin).count()


def _conteo_en_proceso(qs, inicio: datetime, fin: datetime) -> int:
    """Registradas en el periodo que siguen en proceso."""
    return qs.filter(
        estado=EstadoVenta.EN_PROCESO,
        fecha__gte=inicio,
        fecha__lt=fin,
    ).count()


def _serie_instalaciones_diaria(qs, inicio: datetime, fin: datetime) -> dict[date, int]:
    filas = (
        qs.filter(instalado_en__gte=inicio, instalado_en__lt=fin)
        .annotate(dia=TruncDate("instalado_en", tzinfo=LIMA))
        .values("dia")
        .annotate(total=Count("id"))
    )
    return {row["dia"]: row["total"] for row in filas if row["dia"]}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reporte_ventas(request):
    user = request.user
    inicio, fin, ref_desde, ref_hasta = _periodo_desde_request(request)
    ref_mes = date(ref_desde.year, ref_desde.month, 1)
    prev_ref = _mes_anterior(ref_mes)
    prev_inicio, prev_fin = _rango_mes(prev_ref)

    base = _aplicar_filtros(_ventas_visibles(user), request, user)

    instaladas = _conteo_instaladas(base, inicio, fin)
    anuladas = _conteo_anuladas(base, inicio, fin)
    en_proceso = _conteo_en_proceso(base, inicio, fin)

    prev_instaladas = _conteo_instaladas(base, prev_inicio, prev_fin)
    prev_anuladas = _conteo_anuladas(base, prev_inicio, prev_fin)
    prev_en_proceso = _conteo_en_proceso(base, prev_inicio, prev_fin)

    actual_map = _serie_instalaciones_diaria(base, inicio, fin)
    prev_map = _serie_instalaciones_diaria(base, prev_inicio, prev_fin)

    dias_mes = monthrange(ref_mes.year, ref_mes.month)[1]
    serie = []
    acum_actual = 0
    acum_anterior = 0
    for dia in range(1, dias_mes + 1):
        d_actual = date(ref_mes.year, ref_mes.month, dia)
        d_prev = date(prev_ref.year, prev_ref.month, min(dia, monthrange(prev_ref.year, prev_ref.month)[1]))
        v_actual = actual_map.get(d_actual, 0)
        v_prev = prev_map.get(d_prev, 0)
        acum_actual += v_actual
        acum_anterior += v_prev
        serie.append(
            {
                "dia": dia,
                "instalaciones": v_actual,
                "instalaciones_mes_anterior": v_prev,
                "acumulado": acum_actual,
                "acumulado_mes_anterior": acum_anterior,
            }
        )

    return Response(
        {
            "periodo": {
                "desde": ref_desde.isoformat(),
                "hasta": ref_hasta.isoformat(),
                "mes_anterior_desde": prev_ref.isoformat(),
                "mes_anterior_hasta": date(
                    prev_ref.year,
                    prev_ref.month,
                    monthrange(prev_ref.year, prev_ref.month)[1],
                ).isoformat(),
            },
            "kpis": {
                "instaladas": {
                    "valor": instaladas,
                    "mes_anterior": prev_instaladas,
                    "delta_pct": _delta_pct(instaladas, prev_instaladas),
                },
                "anuladas": {
                    "valor": anuladas,
                    "mes_anterior": prev_anuladas,
                    "delta_pct": _delta_pct(anuladas, prev_anuladas),
                },
                "en_proceso": {
                    "valor": en_proceso,
                    "mes_anterior": prev_en_proceso,
                    "delta_pct": _delta_pct(en_proceso, prev_en_proceso),
                },
            },
            "serie_instalaciones": serie,
            "puede_filtrar_asesor": _puede_ver_todas(user),
        }
    )
