from .utils import TAMANO_LETRA_PDF


def mapa_a_json(mapa: dict) -> dict:
    resultado = {}
    for pagina, campos in (mapa or {}).items():
        resultado[str(pagina)] = {
            nombre: [spec[0], spec[1], spec[2] if len(spec) > 2 else {}]
            for nombre, spec in campos.items()
        }
    return resultado


def json_a_mapa(data: dict) -> dict:
    resultado = {}
    for pagina, campos in (data or {}).items():
        resultado[int(pagina)] = {
            nombre: (item[0], item[1], item[2] if len(item) > 2 else {})
            for nombre, item in campos.items()
        }
    return resultado


def _numero(valor, entero=False):
    if valor in (None, ""):
        return 0 if entero else 0
    numero = float(valor)
    if entero or numero == int(numero):
        return int(numero)
    return numero


def mapa_a_campos(data: dict) -> list[dict]:
    campos = []
    for pagina, items in (data or {}).items():
        for nombre, spec in items.items():
            opciones = spec[2] if len(spec) > 2 and isinstance(spec[2], dict) else {}
            campos.append(
                {
                    "pagina": int(pagina),
                    "nombre": nombre,
                    "x": spec[0],
                    "y": spec[1],
                    "tamano": opciones.get("tamano", TAMANO_LETRA_PDF),
                    "max_caracteres": opciones.get("max_caracteres") or "",
                    "field": opciones.get("field") or "",
                    "value": "" if "value" not in opciones else opciones.get("value"),
                    "transform": opciones.get("transform") or "",
                    "hoja": opciones.get("hoja") or "",
                    "celda": opciones.get("celda") or "",
                }
            )
    campos.sort(key=lambda item: (item["pagina"], item["nombre"]))
    return campos


def campos_a_mapa(campos) -> dict:
    if campos in (None, ""):
        return {}
    if isinstance(campos, dict):
        return mapa_a_json(json_a_mapa(campos)) if campos else {}
    if not isinstance(campos, (list, tuple)):
        raise ValueError("Usa una lista de campos.")
    mapa = {}
    vistos = set()
    for item in campos:
        if not isinstance(item, dict):
            continue
        nombre = str(item.get("nombre") or "").strip()
        if not nombre:
            continue
        pagina = str(_numero(item.get("pagina"), entero=True))
        clave = (pagina, nombre)
        if clave in vistos:
            raise ValueError(f"El campo {nombre} está repetido en la página {pagina}.")
        vistos.add(clave)
        opciones = {}
        tamano = item.get("tamano")
        if tamano not in (None, ""):
            opciones["tamano"] = _numero(tamano, entero=True)
        max_caracteres = item.get("max_caracteres")
        if max_caracteres not in (None, ""):
            opciones["max_caracteres"] = _numero(max_caracteres, entero=True)
        field = str(item.get("field") or "").strip()
        if field:
            opciones["field"] = field
        if "value" in item and item.get("value") not in (None, ""):
            opciones["value"] = item.get("value")
        transform = str(item.get("transform") or "").strip()
        if transform:
            opciones["transform"] = transform
        hoja = str(item.get("hoja") or "").strip()
        if hoja:
            opciones["hoja"] = hoja
        celda = str(item.get("celda") or "").strip().upper().replace("$", "")
        if celda:
            opciones["celda"] = celda
        mapa.setdefault(pagina, {})[nombre] = [
            _numero(item.get("x")),
            _numero(item.get("y")),
            opciones,
        ]
    return mapa
