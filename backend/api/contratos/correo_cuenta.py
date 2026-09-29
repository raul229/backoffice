import html
import re
from datetime import datetime
from email.utils import formataddr
from zoneinfo import ZoneInfo

from django.conf import settings
from rest_framework.exceptions import ValidationError

from ..models import TipoCliente
from ..sunat import consultar_sunat
from .utils import nuevo_mensaje_eml, serializar_eml

SALUDO_POR_HORA = (
    (12, "Buenos días"),
    (19, "Buenas tardes"),
    (24, "Buenas noches"),
)

FONT = "Arial, Helvetica, sans-serif"
COLOR_TEXTO = "#1e293b"
COLOR_MUTED = "#64748b"
COLOR_BORDE = "#e2e8f0"
COLOR_FONDO = "#f8fafc"
COLOR_ACENTO = "#0f4c81"
COLOR_OK_FONDO = "#e8f5e9"
COLOR_OK_TEXTO = "#1b5e20"


def generar_correo_cuenta_planner(venta, usuario=None) -> tuple[bytes, str]:
    if venta.cliente.tipo != TipoCliente.EMPRESA:
        raise ValidationError(
            {"detail": "El correo de creación de cuenta solo aplica a persona jurídica."}
        )
    empresa = getattr(venta.cliente, "empresa", None)
    if empresa is None:
        raise ValidationError({"detail": "La venta no tiene datos de empresa."})

    try:
        sunat = consultar_sunat(empresa.ruc)
    except Exception as exc:
        raise ValidationError(
            {
                "detail": (
                    "No se pudo consultar SUNAT para armar el correo. "
                    "Intenta de nuevo en unos minutos."
                )
            }
        ) from exc

    if sunat.get("tipo_cliente") != TipoCliente.EMPRESA:
        raise ValidationError({"detail": "SUNAT no devolvió una ficha de persona jurídica."})

    ruc = sunat.get("ruc") or empresa.ruc
    razon = sunat.get("razon_social") or empresa.razon_social
    rrll = empresa.representante_legal
    celular = (rrll.celular if rrll else "") or ""
    correo = venta.cliente.correo or ""
    ficha = sunat.get("ficha") or []
    representantes = sunat.get("representantes") or []

    saludo = _saludo_lima()
    subject = f"SOLICITUD CREACION DE CUENTA // {ruc}- {razon}"
    plain = _cuerpo_texto(saludo, ruc, razon, ficha, representantes, celular, correo)
    html_body = _cuerpo_html(saludo, ruc, razon, ficha, representantes, celular, correo)

    msg = nuevo_mensaje_eml()
    msg["Subject"] = subject
    msg["From"] = _remitente(usuario)
    msg["To"] = getattr(settings, "CORREO_ASIGNACION_CUENTAS", "") or "asignaciondecuentas@entel.pe"
    cc = getattr(settings, "CORREO_CC_CUENTA_PLANNER", "") or ""
    if cc:
        msg["Cc"] = cc
    msg.set_content(plain, charset="utf-8", cte="8bit")
    msg.add_alternative(html_body, subtype="html", charset="utf-8", cte="8bit")

    return serializar_eml(msg), _nombre_archivo(ruc, razon)


def _remitente(usuario) -> str:
    if usuario is None:
        return getattr(settings, "CORREO_BACKOFFICE", "") or "backoffice@local"
    nombre = f"{usuario.first_name or ''} {usuario.last_name or ''}".strip() or usuario.username
    email = (usuario.email or "").strip() or getattr(settings, "CORREO_BACKOFFICE", "") or "backoffice@local"
    return formataddr((nombre, email))


def _saludo_lima() -> str:
    hora = datetime.now(ZoneInfo("America/Lima")).hour
    for limite, saludo in SALUDO_POR_HORA:
        if hora < limite:
            return saludo
    return "Buenas tardes"


def _nombre_archivo(ruc: str, razon: str) -> str:
    bruto = f"SOLICITUD CREACION DE CUENTA  {ruc}- {(razon or '').strip()}"
    limpio = re.sub(r'[<>:"/\\|?*]', "", bruto)
    limpio = re.sub(r" {2,}", "  ", limpio)
    limpio = limpio.strip(" .-")
    return f"{limpio or ruc or 'solicitud-cuenta'}.eml"


def _cuerpo_texto(saludo, _ruc, _razon, ficha, representantes, celular, correo) -> str:
    lineas = [
        f"{saludo},",
        "",
        "Solicitamos su apoyo para la creación de la siguiente cuenta en Planner:",
        "",
        "— Ficha RUC (SUNAT) —",
        "",
    ]
    for item in ficha:
        label = item.get("label") or ""
        valor = (item.get("value") or "").strip() or "—"
        valores = valor.splitlines()
        if len(valores) == 1:
            lineas.append(f"{label}: {valores[0]}")
        else:
            lineas.append(f"{label}:")
            lineas.extend(f"  · {linea}" for linea in valores)
    if representantes:
        lineas.extend(["", "— Representantes legales —", ""])
        for rep in representantes:
            partes = [
                rep.get("tipo_documento") or "",
                rep.get("numero_documento") or "",
                rep.get("nombre_completo") or "",
                rep.get("cargo") or "",
            ]
            fecha = rep.get("fecha_desde") or ""
            fila = " · ".join(part for part in partes if part)
            if fecha:
                fila = f"{fila} (desde {fecha})"
            lineas.append(f"· {fila}")
    lineas.extend(
        [
            "",
            "— Datos de contacto —",
            "",
            f"Celular: {celular or '—'}",
            f"Correo: {correo or '—'}",
            "",
            "Quedamos atentos.",
        ]
    )
    return "\n".join(lineas).strip() + "\n"


def _cuerpo_html(saludo, _ruc, _razon, ficha, representantes, celular, correo) -> str:
    filas_ficha = "".join(_fila_ficha(item, indice, len(ficha)) for indice, item in enumerate(ficha))
    bloque_reps = _tabla_representantes(representantes)
    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;color:{COLOR_TEXTO};font-family:{FONT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="860" cellspacing="0" cellpadding="0" style="max-width:860px;width:100%;background:#ffffff;border:1px solid {COLOR_BORDE};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:{COLOR_ACENTO};color:#ffffff;font-family:{FONT};">
              <div style="font-size:13px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;">Solicitud Planner</div>
              <div style="margin-top:6px;font-size:20px;font-weight:700;line-height:1.3;">Creación de cuenta</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:{FONT};font-size:14px;line-height:1.5;color:{COLOR_TEXTO};">
              <p style="margin:0 0 16px;">{html.escape(saludo)},</p>
              <p style="margin:0 0 20px;">
                Solicitamos su apoyo para la creación de la siguiente cuenta en Planner
                (<a href="mailto:asignaciondecuentas@entel.pe" style="color:{COLOR_ACENTO};">asignaciondecuentas@entel.pe</a>).
              </p>

              <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:{COLOR_TEXTO};">Ficha RUC</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid {COLOR_BORDE};border-radius:10px;overflow:hidden;">
                {filas_ficha or _fila_vacia("Sin datos SUNAT")}
              </table>

              {bloque_reps}

              <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:{COLOR_TEXTO};">Datos de contacto</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;border:1px solid {COLOR_BORDE};border-radius:10px;overflow:hidden;">
                {_fila_contacto("Celular", celular or "—")}
                {_fila_contacto("Correo", correo or "—", ultimo=True)}
              </table>

              <p style="margin:20px 0 0;color:{COLOR_MUTED};">Quedamos atentos.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _fila_destacada(label: str) -> bool:
    clave = (label or "").casefold()
    return "estado del contribuyente" in clave or (
        "condici" in clave and "contribuyente" in clave
    )


def _fila_ficha(item: dict, indice: int = 0, total: int = 1) -> str:
    label_raw = item.get("label") or ""
    label = html.escape(label_raw)
    valor = (item.get("value") or "").strip()
    if valor:
        valor_html = "<br>".join(html.escape(linea) for linea in valor.splitlines())
    else:
        valor_html = "—"
    borde = "none" if indice >= total - 1 else f"1px solid {COLOR_BORDE}"
    if _fila_destacada(label_raw) and valor:
        fondo = COLOR_OK_FONDO
        color_valor = COLOR_OK_TEXTO
        peso = "700"
    else:
        fondo = "#ffffff"
        color_valor = COLOR_TEXTO
        peso = "400"
    return f"""
                <tr>
                  <td style="width:38%;padding:10px 14px;border-bottom:{borde};background:{COLOR_FONDO};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};vertical-align:top;">{label}</td>
                  <td style="padding:10px 14px;border-bottom:{borde};background:{fondo};font-family:{FONT};font-size:13px;font-weight:{peso};color:{color_valor};vertical-align:top;">{valor_html}</td>
                </tr>
"""


def _fila_vacia(texto: str) -> str:
    return f"""
                <tr>
                  <td colspan="2" style="padding:14px;font-family:{FONT};font-size:13px;color:{COLOR_MUTED};">{html.escape(texto)}</td>
                </tr>
"""


def _fila_contacto(label: str, valor: str, ultimo: bool = False) -> str:
    borde = "none" if ultimo else f"1px solid {COLOR_BORDE}"
    return f"""
                <tr>
                  <td style="width:38%;padding:10px 14px;border-bottom:{borde};background:{COLOR_FONDO};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};">{html.escape(label)}</td>
                  <td style="padding:10px 14px;border-bottom:{borde};font-family:{FONT};font-size:13px;color:{COLOR_TEXTO};">{html.escape(valor)}</td>
                </tr>
"""


def _tabla_representantes(representantes: list[dict]) -> str:
    if not representantes:
        return ""
    filas = []
    for indice, rep in enumerate(representantes):
        borde = "none" if indice == len(representantes) - 1 else f"1px solid {COLOR_BORDE}"
        filas.append(
            f"""
                <tr>
                  <td style="padding:10px 12px;border-bottom:{borde};font-family:{FONT};font-size:13px;">{html.escape(rep.get("tipo_documento") or "—")}</td>
                  <td style="padding:10px 12px;border-bottom:{borde};font-family:{FONT};font-size:13px;">{html.escape(rep.get("numero_documento") or "—")}</td>
                  <td style="padding:10px 12px;border-bottom:{borde};font-family:{FONT};font-size:13px;">{html.escape(rep.get("nombre_completo") or "—")}</td>
                  <td style="padding:10px 12px;border-bottom:{borde};font-family:{FONT};font-size:13px;">{html.escape(rep.get("cargo") or "—")}</td>
                  <td style="padding:10px 12px;border-bottom:{borde};font-family:{FONT};font-size:13px;">{html.escape(rep.get("fecha_desde") or "—")}</td>
                </tr>
"""
        )
    return f"""
              <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:{COLOR_TEXTO};">Representantes legales</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid {COLOR_BORDE};border-radius:10px;overflow:hidden;">
                <tr style="background:{COLOR_FONDO};">
                  <th align="left" style="padding:10px 12px;border-bottom:1px solid {COLOR_BORDE};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};font-weight:600;">Documento</th>
                  <th align="left" style="padding:10px 12px;border-bottom:1px solid {COLOR_BORDE};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};font-weight:600;">Nro.</th>
                  <th align="left" style="padding:10px 12px;border-bottom:1px solid {COLOR_BORDE};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};font-weight:600;">Nombre</th>
                  <th align="left" style="padding:10px 12px;border-bottom:1px solid {COLOR_BORDE};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};font-weight:600;">Cargo</th>
                  <th align="left" style="padding:10px 12px;border-bottom:1px solid {COLOR_BORDE};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};font-weight:600;">Desde</th>
                </tr>
                {"".join(filas)}
              </table>
"""
