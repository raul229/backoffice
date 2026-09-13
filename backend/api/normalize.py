import re

_WHITESPACE = re.compile(r"\s+")


def normalize_upper(value):
    if value is None:
        return value
    text = _WHITESPACE.sub(" ", str(value)).strip()
    return text.upper() if text else ""


def uppercase_fields(data, names):
    for name in names:
        if name in data and data[name] is not None:
            data[name] = normalize_upper(data[name])
    return data
