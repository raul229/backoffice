import re
from datetime import datetime

from rest_framework.exceptions import ValidationError

from .datos_entel import PLANES_ENTEL, PROMOCIONES_ENTEL, VELOCIDADES_SIN_BONO
from .utils import completar_fechas
from ..models import TipoCliente


def format_direccion(direccion) -> str:
    if not direccion:
        return ""
    extras = [
        f"PISO {direccion.piso}" if direccion.piso else "",
        f"INT. {direccion.interior}" if direccion.interior else "",
        f"TIENDA {direccion.tienda}" if direccion.tienda else "",
        f"GAL. {direccion.galeria}" if direccion.galeria else "",
        f"URB. {direccion.urbanizacion}" if direccion.urbanizacion else "",
        direccion.referencia or "",
    ]
    extras = [item for item in extras if item]
    base = f"{direccion.tipo} {direccion.direccion} {direccion.numero}, {direccion.distrito}"
    return f"{base} · {' · '.join(extras)}" if extras else base


def parsear_fecha_contrato(valor) -> str | None:
    if valor in (None, ""):
        return None
    texto = str(valor).strip()
    for formato in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(texto, formato).strftime("%d/%m/%Y")
        except ValueError:
            continue
    raise ValidationError({"fecha": "Usa una fecha válida (AAAA-MM-DD)."})


def parsear_direccion_contrato(valor) -> str | None:
    if valor in (None, ""):
        return None
    texto = re.sub(r"\s+", " ", str(valor)).strip()
    if not texto:
        return None
    if len(texto) > 400:
        raise ValidationError({"direccion": "La dirección no puede superar 400 caracteres."})
    return texto


def nombre_zip_contrato(razon_social: str, ruc: str) -> str:
    bruto = f"{(razon_social or '').strip()} - {(ruc or '').strip()}"
    limpio = re.sub(r'[<>:"/\\|?*]', "", bruto)
    limpio = re.sub(r"\s+", " ", limpio).strip(" .-")
    return f"{limpio or ruc or 'contrato'}.zip"


def inferir_plan(producto) -> str:
    nombre = (producto.nombre or "").upper()
    if "PACK" in nombre:
        return "Pack Empresas"
    return "Internet Empresas"


def inferir_promocion(nombres: list[str], velocidad: int) -> str:
    textos = " ".join(nombres).lower()
    tiene_bono = "bono" in textos
    tiene_30 = "30" in textos
    if velocidad in VELOCIDADES_SIN_BONO:
        return "Solo 30% por 6m."
    if tiene_bono and tiene_30:
        return "30% y bono de velocidad por 6m"
    if tiene_bono:
        return "bono de velocidad por 6m"
    if tiene_30:
        return "Solo 30% por 6m."
    raise ValidationError(
        {"detail": "La venta necesita una promoción Entel (bono de velocidad y/o 30% por 6 meses)."}
    )


def contexto_desde_venta(venta, fecha=None, direccion=None) -> tuple[dict, str, int, str]:
    if venta.cliente.tipo != TipoCliente.EMPRESA:
        raise ValidationError(
            {"detail": "Por ahora solo se generan contratos Entel para persona jurídica."}
        )
    empresa = getattr(venta.cliente, "empresa", None)
    if empresa is None:
        raise ValidationError({"detail": "La venta no tiene datos de empresa."})
    rrll = empresa.representante_legal
    producto = venta.producto
    plan = inferir_plan(producto)
    velocidad = int(producto.velocidad)
    if velocidad not in PLANES_ENTEL.get(plan, {}):
        raise ValidationError(
            {
                "detail": (
                    f"La velocidad {velocidad} Mbps no está en el catálogo Entel de {plan} "
                    f"(200, 300, 500 o 1000)."
                )
            }
        )
    promocion = inferir_promocion(
        list(venta.promociones.values_list("nombre", flat=True)),
        velocidad,
    )
    if promocion not in PROMOCIONES_ENTEL:
        raise ValidationError({"detail": f"Promoción no reconocida: {promocion}"})

    tarifas = PLANES_ENTEL[plan][velocidad]
    domicilio = direccion or format_direccion(venta.direccion)
    nombre_rrll = f"{rrll.nombres} {rrll.apellidos}".strip()
    contexto = completar_fechas(
        {
            "RAZON_SOCIAL": empresa.razon_social,
            "RUC": empresa.ruc,
            "DOMICILIO_FISCAL": domicilio,
            "DOMICILIO_INSTALACION": domicilio,
            "DOMICILIO_INSTALACION_2": domicilio,
            "PARTIDA_REGISTRAL": "",
            "RRLL": nombre_rrll,
            "TIPO_DOCUMENTO_RRLL": rrll.tipo_documento,
            "DNI": rrll.numero_documento,
            "CORREO_RRLL": venta.cliente.correo,
            "CELULAR_RRLL": rrll.celular,
            "SIRO": venta.siro,
            "NO_OPORTUNIDAD": venta.numero_oportunidad,
            "NRO_PSI": venta.psi,
            "OIT": venta.oit,
            "COTIZACION": venta.cotizacion,
            "CONTRATO": venta.contrato,
            "NUMERO_FIJO": venta.numero_fijo,
            "NOMBRE_PLAN": plan,
            "VELOCIDAD": velocidad,
            "PROMOCION": promocion,
            **({"FECHA": fecha} if fecha else {}),
        }
    )
    contexto["RENTA_FIJA"] = str(tarifas["renta"])
    contexto["DESCUENTO"] = str(tarifas["descuento"])
    return contexto, plan, velocidad, promocion
