import html
import http.cookiejar
import re
import urllib.parse
import urllib.request

from .normalize import normalize_upper

SUNAT_URL = "https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias"
SUNAT_REFERER = (
    "https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp"
)

VIA_TIPOS = (
    ("AVENIDA", "AVENIDA"),
    ("JIRON", "JIRON"),
    ("PASAJE", "PASAJE"),
    ("CALLE", "CALLE"),
    ("AV.", "AVENIDA"),
    ("AV", "AVENIDA"),
    ("JR.", "JIRON"),
    ("JR", "JIRON"),
    ("PJE.", "PASAJE"),
    ("PJE", "PASAJE"),
    ("CAL.", "CALLE"),
    ("CAL", "CALLE"),
)

PAIR_RE = re.compile(
    r'list-group-item-heading">\s*([^:<]+):\s*</(?:h4|p)>\s*</div>\s*'
    r'<div[^>]*>\s*<(?:h4|p)[^>]*>\s*(.*?)</(?:h4|p)>',
    re.IGNORECASE | re.DOTALL,
)

REP_ROW_RE = re.compile(
    r"<tr>\s*"
    r"<td[^>]*>\s*([^<]+)</td>\s*"
    r"<td[^>]*>\s*([^<]+)</td>\s*"
    r"<td[^>]*>\s*([^<]+)</td>\s*"
    r"<td[^>]*>\s*([^<]+)</td>",
    re.IGNORECASE | re.DOTALL,
)


def _clean(value):
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    if value in {"-", "--"}:
        return ""
    return normalize_upper(value)


def parse_domicilio(domicilio):
    raw = _clean(domicilio)
    if not raw:
        return {}
    parts = [part.strip() for part in re.split(r"\s+-\s+", raw) if part.strip()]
    distrito = parts[-1] if len(parts) > 1 else ""
    head = parts[0] if parts else raw
    tipo = "CALLE"
    resto = head
    for prefix, mapped in VIA_TIPOS:
        if resto.upper().startswith(prefix):
            tipo = mapped
            resto = resto[len(prefix) :].lstrip(" .")
            break
    numero = ""
    match = re.search(r"\bNRO\.?\s*([A-Z0-9]+)", resto, re.IGNORECASE)
    if match:
        numero = match.group(1)
        direccion = resto[: match.start()].strip(" ,.")
    else:
        direccion = resto
    return {
        "tipo_direccion": tipo,
        "direccion": direccion or raw,
        "numero": numero,
        "distrito": distrito,
    }


def tipo_cliente_desde_ruc(ruc):
    if str(ruc).startswith(("10", "15")):
        return "PERSONA"
    return "EMPRESA"


def documento_desde_ruc(ruc):
    ruc = str(ruc)
    if ruc.startswith("10") and len(ruc) == 11:
        return "DNI", ruc[2:10]
    if ruc.startswith("15") and len(ruc) == 11:
        return "CE", ruc[2:]
    return "", ""


def nombres_desde_razon(razon_social):
    if "," not in razon_social:
        return "", ""
    apellidos, nombres = [part.strip() for part in razon_social.split(",", 1)]
    return nombres, apellidos


def map_tipo_documento(raw):
    texto = _clean(raw).upper()
    if "CE" in texto or "EXT" in texto or "CARNET" in texto:
        return "CE"
    return "DNI"


def split_nombre_completo(nombre):
    parts = _clean(nombre).split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    if len(parts) == 2:
        return parts[1], parts[0]
    return " ".join(parts[2:]), " ".join(parts[:2])


def parse_sunat_html(html_text):
    html_text = html.unescape(html_text or "")
    pairs = {}
    for label, value in PAIR_RE.findall(html_text or ""):
        pairs[_clean(label).lower()] = _clean(value)

    ruc_line = pairs.get("número de ruc") or pairs.get("numero de ruc") or ""
    ruc = ""
    razon_social = ""
    match = re.match(r"(\d{11})\s*-\s*(.+)$", ruc_line)
    if match:
        ruc, razon_social = match.group(1), match.group(2).strip()

    data = {
        "ruc": ruc,
        "razon_social": razon_social,
        "tipo_cliente": tipo_cliente_desde_ruc(ruc) if ruc else "",
        **parse_domicilio(pairs.get("domicilio fiscal", "")),
    }

    if data["tipo_cliente"] == "PERSONA" and razon_social:
        nombres, apellidos = nombres_desde_razon(razon_social)
        if nombres or apellidos:
            data["nombres"] = nombres
            data["apellidos"] = apellidos
        tipo_doc, numero = documento_desde_ruc(ruc)
        if tipo_doc:
            data["tipo_documento"] = tipo_doc
            data["numero_documento"] = numero

    return data


def parse_representantes(html_text):
    html_text = html.unescape(html_text or "")
    representantes = []
    for tipo_raw, numero_raw, nombre_raw, cargo_raw in REP_ROW_RE.findall(html_text):
        tipo = _clean(tipo_raw)
        numero = re.sub(r"\D", "", _clean(numero_raw))
        nombre = _clean(nombre_raw)
        cargo = _clean(cargo_raw)
        if not tipo or tipo.upper().startswith("DOCUMENTO") or not numero or not nombre:
            continue
        nombres, apellidos = split_nombre_completo(nombre)
        representantes.append(
            {
                "tipo_documento": map_tipo_documento(tipo),
                "numero_documento": numero,
                "nombres": nombres,
                "apellidos": apellidos,
                "nombre_completo": nombre,
                "cargo": cargo,
            }
        )
    return representantes


def _sunat_post(opener, fields, referer=SUNAT_REFERER):
    request = urllib.request.Request(
        SUNAT_URL,
        data=urllib.parse.urlencode(fields).encode(),
        method="POST",
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": "https://e-consultaruc.sunat.gob.pe",
            "Referer": referer,
        },
    )
    with opener.open(request, timeout=20) as response:
        return response.read().decode("iso-8859-1", errors="replace")


def consultar_sunat(ruc):
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )
    html_text = _sunat_post(
        opener,
        {
            "accion": "consPorRuc",
            "razSoc": "",
            "nroRuc": ruc,
            "nrodoc": "",
            "token": "backoffice",
            "contexto": "ti-it",
            "modo": "1",
            "rbtnTipo": "1",
            "search1": ruc,
            "tipdoc": "1",
            "search2": "",
            "search3": "",
            "codigo": "",
        },
    )
    parsed = parse_sunat_html(html_text)
    if not parsed.get("ruc"):
        raise ValueError("SUNAT no devolvió datos para este RUC.")

    if parsed.get("tipo_cliente") == "EMPRESA":
        try:
            reps_html = _sunat_post(
                opener,
                {
                    "accion": "getRepLeg",
                    "contexto": "ti-it",
                    "modo": "1",
                    "desRuc": parsed.get("razon_social") or "",
                    "nroRuc": ruc,
                },
                referer=SUNAT_URL,
            )
            parsed["representantes"] = parse_representantes(reps_html)
        except Exception:
            parsed["representantes"] = []
    return parsed
