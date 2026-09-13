from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_502_BAD_GATEWAY

from .models import Direccion, Empresa, Persona, TipoCliente, Venta
from .sunat import consultar_sunat, documento_desde_ruc, parse_domicilio, tipo_cliente_desde_ruc
from .normalize import normalize_upper


def _persona_form(persona):
    if persona is None:
        return {}
    return {
        "tipo_documento": persona.tipo_documento,
        "numero_documento": persona.numero_documento,
        "nombres": persona.nombres,
        "apellidos": persona.apellidos,
        "celular": persona.celular,
        "distrito_nacimiento": persona.distrito_nacimiento,
        "padre": persona.padre,
        "madre": persona.madre,
    }


def _direccion_form(direccion):
    if direccion is None:
        return {}
    return {
        "tipo_direccion": direccion.tipo,
        "direccion": direccion.direccion,
        "numero": direccion.numero,
        "distrito": direccion.distrito,
    }


def _venta_form(venta):
    if venta is None:
        return {}
    return {
        "producto": str(venta.producto_id),
        "flujo": str(venta.flujo_id),
        "promociones": [str(promo_id) for promo_id in venta.promociones.values_list("id", flat=True)],
    }


def _payload(source, ruc, tipo_cliente, cliente_id=None, **fields):
    data = {
        "source": source,
        "ruc": ruc,
        "tipo_cliente": tipo_cliente,
        "cliente_id": cliente_id,
    }
    data.update({key: value for key, value in fields.items() if value not in (None, "")})
    return data


def _with_representantes(payload, representantes):
    if not representantes:
        return payload
    if len(representantes) == 1:
        rep = representantes[0]
        for key in ("tipo_documento", "numero_documento", "nombres", "apellidos"):
            if rep.get(key):
                payload[key] = rep[key]
        return payload
    payload["representantes"] = representantes
    return payload


def find_cliente_por_ruc(ruc):
    empresa = (
        Empresa.objects.select_related("cliente", "representante_legal")
        .filter(ruc=ruc)
        .order_by("-id")
        .first()
    )
    if empresa:
        return empresa.cliente, empresa, empresa.representante_legal

    tipo_doc, numero = documento_desde_ruc(ruc)
    if not numero:
        return None, None, None
    persona = (
        Persona.objects.select_related("cliente")
        .filter(tipo_documento=tipo_doc, numero_documento=numero)
        .order_by("-id")
        .first()
    )
    if persona:
        return persona.cliente, None, persona
    return None, None, None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lookup_ruc(request):
    ruc = str(request.query_params.get("ruc") or "").strip()
    if not ruc.isdigit() or len(ruc) != 11:
        return Response({"detail": "El RUC debe tener 11 dígitos."}, status=HTTP_400_BAD_REQUEST)

    cliente, empresa, persona = find_cliente_por_ruc(ruc)
    if cliente is not None:
        venta = (
            Venta.objects.filter(cliente=cliente)
            .prefetch_related("promociones")
            .order_by("-fecha", "-id")
            .first()
        )
        direccion = cliente.direccion_set.order_by("-id").first()
        payload = _payload(
            "cliente",
            ruc,
            cliente.tipo,
            cliente.id,
            razon_social=empresa.razon_social if empresa else "",
            **_persona_form(persona),
            **_direccion_form(direccion),
            **_venta_form(venta),
        )
        return Response(payload)

    try:
        sunat = consultar_sunat(ruc)
    except Exception:
        return Response(
            {"detail": "No se pudo consultar SUNAT. Completa los datos manualmente."},
            status=HTTP_502_BAD_GATEWAY,
        )

    tipo = sunat.get("tipo_cliente") or tipo_cliente_desde_ruc(ruc)
    representantes = sunat.pop("representantes", []) or []
    sunat.pop("ruc", None)
    sunat.pop("tipo_cliente", None)
    payload = _payload("sunat", ruc, tipo, **sunat)
    if tipo == TipoCliente.PERSONA:
        payload.pop("razon_social", None)
    else:
        payload = _with_representantes(payload, representantes)
    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lookup_direccion(request):
    query = normalize_upper(request.query_params.get("q") or "")
    if len(query) < 2:
        return Response({"items": [], "parsed": {}})

    parsed = parse_domicilio(query)
    complete = bool(parsed.get("numero")) or " - " in query
    parsed = parsed if complete else {}
    rows = (
        Direccion.objects.filter(direccion__icontains=query)
        | Direccion.objects.filter(distrito__icontains=query)
        | Direccion.objects.filter(numero__icontains=query)
    )
    seen = set()
    items = []
    for row in rows.order_by("-id")[:30]:
        key = (row.tipo, row.direccion, row.numero, row.distrito)
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "tipo_direccion": row.tipo,
                "direccion": normalize_upper(row.direccion),
                "numero": normalize_upper(row.numero),
                "distrito": normalize_upper(row.distrito),
            }
        )
        if len(items) >= 8:
            break
    return Response({"items": items, "parsed": parsed})
