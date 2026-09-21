from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from zoneinfo import ZoneInfo

from django.template import Context, Template


def dividir_texto(texto, max_caracteres):
    palabras = str(texto).split()
    numero_lineas = 0
    if not palabras:
        return "", 0

    resultado = palabras[0]
    longitud_actual = len(palabras[0])
    for palabra in palabras[1:]:
        if longitud_actual + 1 + len(palabra) <= max_caracteres:
            resultado += " " + palabra
            longitud_actual += 1 + len(palabra)
        else:
            resultado += "\n" + palabra
            longitud_actual = len(palabra)
            numero_lineas += 1
    return resultado, numero_lineas


def completar_fechas(contexto: dict) -> dict:
    meses = {
        "01": "Enero",
        "02": "Febrero",
        "03": "Marzo",
        "04": "Abril",
        "05": "Mayo",
        "06": "Junio",
        "07": "Julio",
        "08": "Agosto",
        "09": "Septiembre",
        "10": "Octubre",
        "11": "Noviembre",
        "12": "Diciembre",
    }
    fecha = contexto.get("FECHA") or datetime.now(ZoneInfo("America/Lima")).strftime("%d/%m/%Y")
    dia, mes, anio = fecha.split("/")
    contexto.update(
        {
            "FECHA": fecha,
            "DIA": dia,
            "MES": mes,
            "NOMBRE_MES": meses.get(mes, ""),
            "ANIO": anio,
        }
    )
    return contexto


def generar_eml(plantilla: Path, contexto: dict, adjuntos: list[Path], carpeta_destino: Path) -> Path:
    rendered = Template(plantilla.read_text(encoding="utf-8")).render(Context(contexto, autoescape=False))
    metadata = _parsear_eml_plantilla(rendered)
    msg = EmailMessage()
    msg["Subject"] = metadata["subject"]
    msg["From"] = metadata["from"]
    msg["To"] = metadata["to"]
    if metadata.get("cc"):
        msg["Cc"] = metadata["cc"]
    if metadata.get("bcc"):
        msg["Bcc"] = metadata["bcc"]
    msg.set_content(metadata["body"])

    for ruta_adj in adjuntos:
        ruta_adj = Path(ruta_adj)
        if not ruta_adj.exists():
            continue
        msg.add_attachment(
            ruta_adj.read_bytes(),
            maintype="application",
            subtype="octet-stream",
            filename=ruta_adj.name,
        )

    carpeta_destino.mkdir(parents=True, exist_ok=True)
    nombre = f"correo_{contexto.get('RUC', 'cliente')}.eml"
    salida = carpeta_destino / nombre
    salida.write_bytes(bytes(msg))
    return salida


def _parsear_eml_plantilla(rendered: str) -> dict:
    campos = {"subject", "from", "to", "cc", "bcc", "body"}
    metadata = {campo: "" for campo in campos}
    lineas = rendered.splitlines()
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        match = next((campo for campo in campos if linea.startswith(f"{campo}:")), None)
        if match is None:
            i += 1
            continue
        _clave, _sep, valor_inicial = linea.partition(":")
        valor = valor_inicial.strip()
        if match == "body" and "|" in valor_inicial:
            i += 1
            bloque = []
            while i < len(lineas) and (
                lineas[i].startswith("    ") or lineas[i].startswith("\t") or lineas[i] == ""
            ):
                bloque.append(lineas[i].lstrip())
                i += 1
            metadata["body"] = "\n".join(bloque).strip()
            break
        i += 1
        while i < len(lineas) and (lineas[i].startswith("    ") or lineas[i].startswith("\t")):
            valor += " " + lineas[i].strip()
            i += 1
        metadata[match] = valor
    return metadata
