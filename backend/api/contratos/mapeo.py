import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from rest_framework.exceptions import ValidationError

from .datos_entel import PROMOCIONES_ENTEL, VELOCIDADES_SIN_BONO
from .utils import completar_fechas
from ..models import TipoBonoVelocidad, TipoCliente

IGV = Decimal("1.18")


def dinero(valor) -> str:
    return str(Decimal(str(valor or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def texto_galeria(direccion) -> str:
    if not direccion or not direccion.galeria:
        return ""
    tipo = direccion.tipo_galeria.nombre if getattr(direccion, "tipo_galeria_id", None) else ""
    return f"{tipo} {direccion.galeria}".strip() if tipo else direccion.galeria


def format_direccion(direccion) -> str:
    if not direccion:
        return ""
    extras = [
        f"PISO {direccion.piso}" if direccion.piso else "",
        f"INT. {direccion.interior}" if direccion.interior else "",
        f"TIENDA {direccion.tienda}" if direccion.tienda else "",
        texto_galeria(direccion),
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


def inferir_promocion_por_nombre(nombres: list[str], velocidad: int) -> str:
    textos = " ".join(nombres).lower()
    tiene_bono = "bono" in textos
    tiene_descuento = "30" in textos or "20" in textos
    if velocidad in VELOCIDADES_SIN_BONO:
        tiene_bono = False
    if tiene_bono and tiene_descuento:
        return "30% y bono de velocidad por 6m"
    if tiene_bono:
        return "bono de velocidad por 6m"
    if tiene_descuento:
        return "Solo 30% por 6m."
    raise ValidationError(
        {"detail": "La venta necesita una promoción con descuento o bono de velocidad."}
    )


def inferir_promocion(promos, velocidad: int) -> str:
    items = list(promos or [])
    if items and hasattr(items[0], "bono_velocidad"):
        tiene_bono = any(
            getattr(item, "bono_velocidad", TipoBonoVelocidad.NINGUNO) not in ("", TipoBonoVelocidad.NINGUNO)
            for item in items
        )
        tiene_descuento = any(Decimal(str(getattr(item, "descuento_porcentaje", 0) or 0)) > 0 for item in items)
        if tiene_bono or tiene_descuento:
            if velocidad in VELOCIDADES_SIN_BONO:
                tiene_bono = False
            if tiene_bono and tiene_descuento:
                return "30% y bono de velocidad por 6m"
            if tiene_bono:
                return "bono de velocidad por 6m"
            return "Solo 30% por 6m."
        nombres = [item.nombre for item in items if getattr(item, "nombre", None)]
    else:
        nombres = [str(item) for item in items if item]
    return inferir_promocion_por_nombre(nombres, velocidad)


def beneficios_promociones(promos, velocidad: int) -> dict:
    descuento_pct = Decimal("0")
    tipo_bono = TipoBonoVelocidad.NINGUNO
    bono_mbps = 0
    for promo in promos or []:
        pct = Decimal(str(getattr(promo, "descuento_porcentaje", 0) or 0))
        if pct > descuento_pct:
            descuento_pct = pct
        tipo = getattr(promo, "bono_velocidad", TipoBonoVelocidad.NINGUNO) or TipoBonoVelocidad.NINGUNO
        if tipo == TipoBonoVelocidad.DUPLICA:
            tipo_bono = TipoBonoVelocidad.DUPLICA
        elif tipo == TipoBonoVelocidad.FIJO and tipo_bono != TipoBonoVelocidad.DUPLICA:
            tipo_bono = TipoBonoVelocidad.FIJO
            bono_mbps = max(bono_mbps, int(getattr(promo, "bono_mbps", 0) or 0))
    if descuento_pct == 0 and tipo_bono == TipoBonoVelocidad.NINGUNO:
        textos = " ".join(str(getattr(item, "nombre", item) or "") for item in (promos or [])).lower()
        if "20" in textos:
            descuento_pct = Decimal("20")
        elif "30" in textos:
            descuento_pct = Decimal("30")
        if "duplica" in textos or "bono" in textos:
            tipo_bono = TipoBonoVelocidad.DUPLICA
        elif "300" in textos:
            tipo_bono = TipoBonoVelocidad.FIJO
            bono_mbps = 300
    velocidad = int(velocidad or 0)
    if tipo_bono == TipoBonoVelocidad.DUPLICA:
        bono_mbps = velocidad
        velocidad_con_bono = velocidad * 2
        etiqueta_bono = "Duplica la velocidad"
    elif tipo_bono == TipoBonoVelocidad.FIJO:
        velocidad_con_bono = velocidad + bono_mbps
        etiqueta_bono = f"{bono_mbps} Mbps adicionales"
    else:
        velocidad_con_bono = velocidad
        bono_mbps = 0
        etiqueta_bono = ""
    return {
        "descuento_porcentaje": descuento_pct,
        "tipo_bono": tipo_bono,
        "bono_mbps": bono_mbps,
        "velocidad_con_bono": velocidad_con_bono,
        "etiqueta_bono": etiqueta_bono,
    }


def monto_descuento(precio, porcentaje) -> Decimal:
    return montos_descuento(precio, porcentaje)[1]


def montos_descuento(precio, porcentaje) -> tuple[Decimal, Decimal]:
    """(con IGV, sin IGV). El con IGV es % del precio; el sin IGV es ese monto ÷ 1.18."""
    pct = Decimal(str(porcentaje or 0))
    base = Decimal(str(precio or 0))
    if pct <= 0 or base <= 0:
        cero = Decimal("0.00")
        return cero, cero
    con_igv = (base * pct / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    sin_igv = (con_igv / IGV).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return con_igv, sin_igv


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
    promos = list(venta.promociones.all())
    nombres_promo = [item.nombre for item in promos if item.nombre]
    promocion = inferir_promocion(promos, velocidad)
    if promocion not in PROMOCIONES_ENTEL:
        raise ValidationError({"detail": f"Promoción no reconocida: {promocion}"})

    beneficios = beneficios_promociones(promos, velocidad)
    descuento_igv, descuento = montos_descuento(producto.precio, beneficios["descuento_porcentaje"])
    pct = beneficios["descuento_porcentaje"]
    renta = Decimal(str(producto.precio or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    renta_sin_igv = (renta / IGV).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    pago_igv = (renta - descuento_igv).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    pago_sin_igv = (pago_igv / IGV).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    domicilio = direccion or format_direccion(venta.direccion)
    fiscal = (empresa.domicilio_fiscal or "").strip() or domicilio
    nombre_rrll = f"{rrll.nombres} {rrll.apellidos}".strip()
    contexto = completar_fechas(
        {
            "RAZON_SOCIAL": empresa.razon_social,
            "RUC": empresa.ruc,
            "DOMICILIO_FISCAL": fiscal,
            "DOMICILIO_INSTALACION": domicilio,
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
            "SAF": venta.saf,
            "NOMBRE_PLAN": producto.nombre,
            "VELOCIDAD": velocidad,
            "VELOCIDAD_CON_BONO": beneficios["velocidad_con_bono"],
            "BONO_MBPS": beneficios["bono_mbps"] or "",
            "TIPO_BONO": beneficios["etiqueta_bono"],
            "PROMOCION": " · ".join(nombres_promo),
            "DESCUENTO_PORCENTAJE": str(pct.quantize(Decimal("1")) if pct == pct.to_integral() else pct),
            "PRECIO_PRODUCTO": dinero(renta),
            "RENTA_SIN_IGV": dinero(renta_sin_igv),
            "RENTA_CON_DESCUENTO": dinero(pago_igv),
            "RENTA_CON_DESCUENTO_SIN_IGV": dinero(pago_sin_igv),
            "DESCUENTO_CON_IGV": dinero(descuento_igv) if descuento_igv > 0 else "",
            "DISTRITO": getattr(venta.direccion, "distrito", "") or "",
            "DEPARTAMENTO": "LIMA",
            "PROVINCIA": "LIMA",
            **({"FECHA": fecha} if fecha else {}),
        }
    )
    contexto["RENTA_FIJA"] = dinero(renta)
    contexto["DESCUENTO"] = dinero(descuento) if descuento > 0 else ""
    if beneficios["descuento_porcentaje"] <= 0:
        contexto["DESCUENTO_PORCENTAJE"] = ""
    return contexto, plan, velocidad, promocion
