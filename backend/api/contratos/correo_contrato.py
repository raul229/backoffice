"""HTML de marca Entel para el correo de contratos al cliente."""

from __future__ import annotations

import html
from pathlib import Path

# Colores Entel (logo: azul + acento naranja), usados con sutileza.
COLOR_AZUL = "#0057FF"
COLOR_NARANJA = "#FF4A00"
COLOR_FONDO = "#f4f6fb"
COLOR_TARJETA = "#ffffff"
COLOR_BORDE = "#d9e2f2"
COLOR_TEXTO = "#1a1f2e"
COLOR_MUTED = "#5b657a"
COLOR_AZUL_SUAVE = "#eef3ff"
FONT = "Arial, Helvetica, sans-serif"


def cuerpo_html_contrato(contexto: dict, adjuntos: list[Path] | None = None) -> str:
    rrll = html.escape(str(contexto.get("RRLL") or "cliente"))
    plan = html.escape(str(contexto.get("NOMBRE_PLAN") or "—"))
    velocidad = html.escape(str(contexto.get("VELOCIDAD") or "—"))
    promocion = html.escape(str(contexto.get("PROMOCION") or "—"))
    oportunidad = html.escape(str(contexto.get("NO_OPORTUNIDAD") or "—"))
    domicilio = html.escape(str(contexto.get("DOMICILIO_INSTALACION") or "—"))

    filas = "".join(
        [
            _fila("Número de oportunidad", oportunidad),
            _fila("Dirección de instalación", domicilio),
            _fila("Plan contratado", f"{plan} {velocidad}"),
            _fila("Nombre de promoción", promocion),
            _fila("Plazo de promoción", "6 meses", ultimo=True),
        ]
    )
    del adjuntos  # los PDFs ya van como attachments MIME

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:{COLOR_FONDO};color:{COLOR_TEXTO};font-family:{FONT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{COLOR_FONDO};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="860" cellspacing="0" cellpadding="0" style="max-width:860px;width:100%;background:{COLOR_TARJETA};border:1px solid {COLOR_BORDE};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:18px 28px;background:{COLOR_AZUL};color:#ffffff;font-family:{FONT};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:{FONT};">
                    <span style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">e</span><span style="font-size:22px;font-weight:700;color:{COLOR_NARANJA};">)</span>
                    <span style="margin-left:10px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.9;">Entel Empresas</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:{COLOR_NARANJA};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:{FONT};font-size:14px;line-height:1.55;color:{COLOR_TEXTO};">
              <p style="margin:0 0 14px;">Estimado <strong>{rrll}</strong></p>
              <p style="margin:0 0 20px;">
                Enviamos el resumen de la venta del servicio de internet contrato.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid {COLOR_BORDE};border-radius:10px;overflow:hidden;">
                {filas}
              </table>

              <p style="margin:0;color:{COLOR_MUTED};">Gracias por su compra</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _fila(label: str, valor: str, ultimo: bool = False) -> str:
    borde = "none" if ultimo else f"1px solid {COLOR_BORDE}"
    return f"""
                <tr>
                  <td style="width:34%;padding:10px 14px;border-bottom:{borde};background:{COLOR_AZUL_SUAVE};font-family:{FONT};font-size:12px;color:{COLOR_MUTED};vertical-align:top;">{html.escape(label)}</td>
                  <td style="padding:10px 14px;border-bottom:{borde};font-family:{FONT};font-size:13px;color:{COLOR_TEXTO};vertical-align:top;">{valor}</td>
                </tr>
"""
