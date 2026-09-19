from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .normalize import uppercase_fields

from .models import (
    Cliente,
    Direccion,
    Empresa,
    EstadoPaso,
    EstadoVenta,
    Flujo,
    FlujoPaso,
    Paso,
    Persona,
    Producto,
    Promocion,
    PromocionVenta,
    TipoCliente,
    TipoDireccion,
    TipoDocumento,
    Venta,
    VentaComentario,
    VentaPaso,
)

VENTA_CODIGO_FIELDS = (
    "psi",
    "siro",
    "numero_oportunidad",
    "oit",
    "cotizacion",
    "contrato",
    "numero_fijo",
    "numero_orden",
)


def user_brief(user):
    if not user:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


class ChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


def serialize_choices(choices):
    return [{"value": value, "label": label} for value, label in choices]


def normalize_correo(value):
    return (value or "").strip().lower()


def cliente_con_correo(validated_data, tipo):
    correo = normalize_correo(validated_data.pop("correo"))
    cliente = validated_data.get("cliente")
    if cliente is None:
        validated_data["cliente"] = Cliente.objects.create(tipo=tipo, correo=correo)
        return validated_data
    if cliente.correo != correo:
        cliente.correo = correo
        cliente.save(update_fields=["correo"])
    return validated_data


class DireccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Direccion
        fields = [
            "id",
            "cliente",
            "tipo",
            "direccion",
            "numero",
            "distrito",
            "urbanizacion",
            "interior",
            "tienda",
            "piso",
            "galeria",
            "referencia",
        ]
        validators = []

    def validate(self, attrs):
        uppercase_fields(
            attrs,
            [
                "direccion",
                "numero",
                "distrito",
                "urbanizacion",
                "interior",
                "tienda",
                "piso",
                "galeria",
                "referencia",
            ],
        )
        return attrs

    def create(self, validated_data):
        lookup = {
            "cliente": validated_data["cliente"],
            "tipo": validated_data.get("tipo") or "",
            "direccion": validated_data.get("direccion") or "",
            "numero": validated_data.get("numero") or "",
            "distrito": validated_data.get("distrito") or "",
            "urbanizacion": validated_data.get("urbanizacion") or "",
            "interior": validated_data.get("interior") or "",
            "tienda": validated_data.get("tienda") or "",
            "piso": validated_data.get("piso") or "",
            "galeria": validated_data.get("galeria") or "",
            "referencia": validated_data.get("referencia") or "",
        }
        try:
            direccion, _created = Direccion.objects.get_or_create(**lookup)
        except IntegrityError:
            direccion = Direccion.objects.get(**lookup)
        return direccion


class PersonaSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), required=False
    )
    correo = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = Persona
        fields = [
            "id",
            "cliente",
            "correo",
            "tipo_documento",
            "numero_documento",
            "nombres",
            "apellidos",
            "distrito_nacimiento",
            "padre",
            "madre",
            "celular",
        ]

    def validate(self, attrs):
        uppercase_fields(attrs, ["nombres", "apellidos", "distrito_nacimiento", "padre", "madre"])
        if self.instance is None and not attrs.get("correo"):
            raise serializers.ValidationError(
                {"correo": "El correo de facturación es obligatorio."}
            )
        if "correo" in attrs:
            attrs["correo"] = normalize_correo(attrs["correo"])
        tipo = attrs.get("tipo_documento") or getattr(self.instance, "tipo_documento", None)
        numero = attrs.get("numero_documento") or getattr(self.instance, "numero_documento", "")
        expected = 8 if tipo == TipoDocumento.DNI else 9 if tipo == TipoDocumento.CE else None
        if expected and (not str(numero).isdigit() or len(str(numero)) != expected):
            raise serializers.ValidationError(
                {
                    "numero_documento": (
                        "El DNI debe tener 8 dígitos"
                        if expected == 8
                        else "El carné de extranjería debe tener 9 dígitos"
                    )
                }
            )
        return attrs

    def create(self, validated_data):
        cliente_con_correo(validated_data, TipoCliente.PERSONA)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("cliente", None)
        correo = validated_data.pop("correo", None)
        instance = super().update(instance, validated_data)
        if correo is not None and instance.cliente.correo != correo:
            instance.cliente.correo = correo
            instance.cliente.save(update_fields=["correo"])
        return instance


class EmpresaSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), required=False
    )
    representante_legal_detalle = PersonaSerializer(
        source="representante_legal", read_only=True
    )
    correo = serializers.EmailField(write_only=True, required=False)

    class Meta:
        model = Empresa
        fields = [
            "id",
            "cliente",
            "correo",
            "ruc",
            "razon_social",
            "representante_legal",
            "representante_legal_detalle",
        ]

    def validate(self, attrs):
        uppercase_fields(attrs, ["razon_social"])
        if self.instance is None and not attrs.get("correo"):
            raise serializers.ValidationError(
                {"correo": "El correo de facturación es obligatorio."}
            )
        if "correo" in attrs:
            attrs["correo"] = normalize_correo(attrs["correo"])
        return attrs

    def create(self, validated_data):
        cliente_con_correo(validated_data, TipoCliente.EMPRESA)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("cliente", None)
        correo = validated_data.pop("correo", None)
        instance = super().update(instance, validated_data)
        if correo is not None and instance.cliente.correo != correo:
            instance.cliente.correo = correo
            instance.cliente.save(update_fields=["correo"])
        return instance


class ClienteSerializer(serializers.ModelSerializer):
    persona = PersonaSerializer(read_only=True)
    empresa = EmpresaSerializer(read_only=True)
    direcciones = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ["id", "tipo", "correo", "persona", "empresa", "direcciones"]
        extra_kwargs = {
            "tipo": {"read_only": True},
        }

    def validate_correo(self, value):
        correo = normalize_correo(value)
        if not correo:
            raise serializers.ValidationError("El correo de facturación es obligatorio.")
        return correo

    def get_direcciones(self, obj):
        return DireccionSerializer(obj.direccion_set.all(), many=True).data


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ["id", "nombre", "velocidad", "precio", "tipo_cliente"]

    def validate(self, attrs):
        uppercase_fields(attrs, ["nombre"])
        return attrs


class PromocionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promocion
        fields = ["id", "nombre", "descripcion"]

    def validate(self, attrs):
        uppercase_fields(attrs, ["nombre", "descripcion"])
        return attrs


class PasoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paso
        fields = ["id", "nombre", "descripcion"]


class FlujoPasoSerializer(serializers.ModelSerializer):
    paso_detalle = PasoSerializer(source="paso", read_only=True)

    class Meta:
        model = FlujoPaso
        fields = ["id", "flujo", "paso", "paso_detalle", "orden"]


class FlujoSerializer(serializers.ModelSerializer):
    pasos_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Flujo
        fields = ["id", "nombre", "tipo_cliente", "pasos_detalle"]
        read_only_fields = ["pasos_detalle"]

    def get_pasos_detalle(self, obj):
        flujo_pasos = obj.flujopaso_set.select_related("paso").order_by("orden")
        return FlujoPasoSerializer(flujo_pasos, many=True).data


class PromocionVentaSerializer(serializers.ModelSerializer):
    promocion_detalle = PromocionSerializer(source="promocion", read_only=True)

    class Meta:
        model = PromocionVenta
        fields = ["id", "venta", "promocion", "promocion_detalle"]


class VentaPasoSerializer(serializers.ModelSerializer):
    flujo_paso_detalle = FlujoPasoSerializer(source="flujo_paso", read_only=True)

    class Meta:
        model = VentaPaso
        fields = ["id", "venta", "flujo_paso", "flujo_paso_detalle", "estado"]


class VentaComentarioSerializer(serializers.ModelSerializer):
    creado_por_detalle = serializers.SerializerMethodField()

    class Meta:
        model = VentaComentario
        fields = ["id", "venta", "texto", "fecha", "creado_por", "creado_por_detalle"]
        read_only_fields = ["fecha", "creado_por"]

    def get_creado_por_detalle(self, obj):
        return user_brief(obj.creado_por)

    def validate_texto(self, value):
        texto = (value or "").strip()
        if not texto:
            raise serializers.ValidationError("Escribe un comentario.")
        if len(texto) > 2000:
            raise serializers.ValidationError("El comentario es demasiado largo.")
        return texto

    def validate_venta(self, venta):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError("No puedes comentar esta venta.")
        if user.is_superuser or user.has_perm("api.view_all_ventas"):
            return venta
        if venta.creado_por_id != user.id:
            raise serializers.ValidationError("No puedes comentar esta venta.")
        return venta


class VentaSerializer(serializers.ModelSerializer):
    cliente_detalle = ClienteSerializer(source="cliente", read_only=True)
    direccion_detalle = DireccionSerializer(source="direccion", read_only=True)
    producto_detalle = ProductoSerializer(source="producto", read_only=True)
    flujo_detalle = FlujoSerializer(source="flujo", read_only=True)
    promociones = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Promocion.objects.all(), required=False
    )
    promociones_detalle = PromocionSerializer(
        source="promociones", many=True, read_only=True
    )
    pasos = serializers.SerializerMethodField()
    comentarios = serializers.SerializerMethodField()
    creado_por = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    creado_por_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            "id",
            "cliente",
            "cliente_detalle",
            "direccion",
            "direccion_detalle",
            "fecha",
            "producto",
            "producto_detalle",
            "flujo",
            "flujo_detalle",
            "promociones",
            "promociones_detalle",
            "estado",
            "psi",
            "siro",
            "numero_oportunidad",
            "oit",
            "cotizacion",
            "contrato",
            "numero_fijo",
            "numero_orden",
            "pasos",
            "comentarios",
            "creado_por",
            "creado_por_detalle",
        ]
        read_only_fields = ["fecha"]

    def validate(self, attrs):
        uppercase_fields(attrs, list(VENTA_CODIGO_FIELDS))
        cliente = attrs.get("cliente") or getattr(self.instance, "cliente", None)
        flujo = attrs.get("flujo") or getattr(self.instance, "flujo", None)
        producto = attrs.get("producto") or getattr(self.instance, "producto", None)
        direccion = attrs.get("direccion") or getattr(self.instance, "direccion", None)
        if cliente and flujo and flujo.tipo_cliente != cliente.tipo:
            raise serializers.ValidationError(
                {
                    "flujo": "El flujo no corresponde al tipo de cliente. "
                    "Usa un flujo de persona natural (RUC 10) o de empresa (RUC 20)."
                }
            )
        if cliente and producto and producto.tipo_cliente != cliente.tipo:
            raise serializers.ValidationError(
                {
                    "producto": "El producto no corresponde al tipo de cliente. "
                    "Usa un producto de persona natural o de empresa."
                }
            )
        if direccion and cliente and direccion.cliente_id != cliente.id:
            raise serializers.ValidationError(
                {"direccion": "La dirección no pertenece a este cliente."}
            )
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if "creado_por" in attrs and self.instance is not None:
            if user is None or not (
                user.is_superuser or user.has_perm("api.reasignar_venta")
            ):
                raise serializers.ValidationError(
                    {"creado_por": "No tienes permiso para reasignar ventas."}
                )
            nuevo = attrs.get("creado_por")
            if nuevo is None:
                raise serializers.ValidationError(
                    {"creado_por": "Debes elegir un asesor."}
                )
            if not nuevo.has_perm("api.add_venta"):
                raise serializers.ValidationError(
                    {"creado_por": "El usuario no puede recibir ventas. Debe poder registrarlas."}
                )
        return attrs

    def _sync_pasos(self, venta):
        venta.ventapaso_set.all().delete()
        flujo_pasos = FlujoPaso.objects.filter(flujo=venta.flujo).order_by("orden")
        VentaPaso.objects.bulk_create(
            [VentaPaso(venta=venta, flujo_paso=flujo_paso) for flujo_paso in flujo_pasos]
        )

    def get_pasos(self, obj):
        venta_pasos = obj.ventapaso_set.select_related("flujo_paso__paso").order_by(
            "flujo_paso__orden"
        )
        return VentaPasoSerializer(venta_pasos, many=True).data

    def get_comentarios(self, obj):
        comentarios = obj.comentarios.select_related("creado_por").order_by("fecha")
        return VentaComentarioSerializer(comentarios, many=True).data

    def get_creado_por_detalle(self, obj):
        return user_brief(obj.creado_por)

    @transaction.atomic
    def create(self, validated_data):
        promociones = validated_data.pop("promociones", [])
        venta = Venta.objects.create(**validated_data)
        venta.promociones.set(promociones)
        self._sync_pasos(venta)
        return venta

    @transaction.atomic
    def update(self, instance, validated_data):
        promociones = validated_data.pop("promociones", None)
        flujo_nuevo = validated_data.get("flujo")
        flujo_cambio = flujo_nuevo is not None and flujo_nuevo != instance.flujo
        venta = super().update(instance, validated_data)
        if promociones is not None:
            venta.promociones.set(promociones)
        if flujo_cambio:
            self._sync_pasos(venta)
        return venta


CHOICE_GROUPS = {
    "tipos_cliente": TipoCliente.choices,
    "tipos_documento": TipoDocumento.choices,
    "tipos_direccion": TipoDireccion.choices,
    "estados_paso": EstadoPaso.choices,
    "estados_venta": EstadoVenta.choices,
}
