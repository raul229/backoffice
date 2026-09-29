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
SUNAT_ORIGIN = "https://e-consultaruc.sunat.gob.pe"
SUNAT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
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

# SUNAT: label en col-sm-3/5 + valor en col-sm-3/7 (texto o tabla tblResultado).
PAIR_RE = re.compile(
    r'<div class="col-sm-\d+"[^>]*>\s*'
    r'<h4 class="list-group-item-heading">\s*(.*?):\s*</h4>\s*'
    r"</div>\s*"
    r'<div class="col-sm-\d+"[^>]*>\s*(.*?)\s*</div>',
    re.IGNORECASE | re.DOTALL,
)

TABLE_CELL_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.IGNORECASE | re.DOTALL)
VALUE_TEXT_RE = re.compile(
    r"<(?:h4|p)[^>]*>(.*?)</(?:h4|p)>",
    re.IGNORECASE | re.DOTALL,
)
COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)

REP_ROW_RE = re.compile(
    r"<tr>\s*"
    r"<td[^>]*>\s*([^<]+)</td>\s*"
    r"<td[^>]*>\s*([^<]+)</td>\s*"
    r"<td[^>]*>\s*([^<]+)</td>\s*"
    r"<td[^>]*>\s*([^<]+)</td>"
    r"(?:\s*<td[^>]*>\s*([^<]*)</td>)?",
    re.IGNORECASE | re.DOTALL,
)


def _clean(value):
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    if value in {"-", "--"}:
        return ""
    return normalize_upper(value)


def _clean_multiline(value):
    value = html.unescape(value or "")
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"</p\s*>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", " ", value)
    lineas = []
    for linea in value.splitlines():
        limpia = re.sub(r"\s+", " ", linea).strip()
        if limpia and limpia not in {"-", "--"}:
            lineas.append(normalize_upper(limpia))
    return "\n".join(lineas)


def _valor_desde_contenedor(raw: str) -> str:
    """Extrae texto de <p>/<h4> o filas de <table class="tblResultado">."""
    celdas = TABLE_CELL_RE.findall(raw or "")
    if celdas:
        lineas = []
        for celda in celdas:
            limpia = _clean_multiline(celda)
            if limpia:
                lineas.append(limpia)
        return "\n".join(lineas)
    match = VALUE_TEXT_RE.search(raw or "")
    if match:
        return _clean_multiline(match.group(1))
    return _clean_multiline(raw)


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
    razon = _clean(razon_social)
    if not razon:
        return "", ""
    if "," in razon:
        apellidos, nombres = [part.strip() for part in razon.split(",", 1)]
        return nombres, apellidos
    return split_nombre_completo(razon)


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
    # Quitar comentarios HTML (SUNAT deja un bloque muerto "Razón Social: eeee").
    html_text = COMMENT_RE.sub("", html_text or "")
    html_text = html.unescape(html_text)
    pairs = {}
    ficha = []
    for label_raw, value_raw in PAIR_RE.findall(html_text):
        label = re.sub(r"\s+", " ", html.unescape(label_raw or "")).strip(" :")
        # El label no debe arrastrar markup residual.
        label = re.sub(r"<[^>]+>", " ", label)
        label = re.sub(r"\s+", " ", label).strip(" :")
        if not label:
            continue
        value = _valor_desde_contenedor(value_raw)
        pairs[_clean(label).lower()] = value.replace("\n", " ") if value else ""
        ficha.append({"label": label, "value": value})

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
        "ficha": ficha,
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
    for tipo_raw, numero_raw, nombre_raw, cargo_raw, fecha_raw in REP_ROW_RE.findall(html_text):
        tipo = _clean(tipo_raw)
        numero = re.sub(r"\D", "", _clean(numero_raw))
        nombre = _clean(nombre_raw)
        cargo = _clean(cargo_raw)
        fecha_desde = _clean(fecha_raw)
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
                "fecha_desde": fecha_desde,
            }
        )
    return representantes


def _sunat_headers(referer=SUNAT_REFERER, form=False):
    headers = {
        "User-Agent": SUNAT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
        "Referer": referer,
    }
    if form:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        headers["Origin"] = SUNAT_ORIGIN
    return headers


def _sunat_request(opener, url, fields=None, referer=SUNAT_REFERER):
    data = urllib.parse.urlencode(fields).encode() if fields is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method="POST" if data is not None else "GET",
        headers=_sunat_headers(referer, form=data is not None),
    )
    with opener.open(request, timeout=20) as response:
        return response.read().decode("iso-8859-1", errors="replace")


def _sunat_post(opener, fields, referer=SUNAT_REFERER):
    return _sunat_request(opener, SUNAT_URL, fields, referer=referer)


def consultar_sunat(ruc):
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )
    # SUNAT rejects the lookup POST unless the browser first opens the search page
    # and sends a real User-Agent. Without that session the WAF answers 403.
    _sunat_request(opener, SUNAT_REFERER)
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
