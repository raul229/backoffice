from django.db import transaction
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
    VentaPaso,
)


class ChoiceSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


def serialize_choices(choices):
    return [{"value": value, "label": label} for value, label in choices]


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
            "manzana",
            "lote",
            "referencia",
        ]

    def validate(self, attrs):
        uppercase_fields(
            attrs,
            ["direccion", "numero", "distrito", "urbanizacion", "manzana", "lote", "referencia"],
        )
        return attrs


class PersonaSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), required=False
    )

    class Meta:
        model = Persona
        fields = [
            "id",
            "cliente",
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
        cliente = validated_data.get("cliente")
        if cliente is None:
            cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
            validated_data["cliente"] = cliente
        return super().create(validated_data)


class EmpresaSerializer(serializers.ModelSerializer):
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), required=False
    )
    representante_legal_detalle = PersonaSerializer(
        source="representante_legal", read_only=True
    )

    class Meta:
        model = Empresa
        fields = [
            "id",
            "cliente",
            "ruc",
            "razon_social",
            "representante_legal",
            "representante_legal_detalle",
        ]

    def validate(self, attrs):
        uppercase_fields(attrs, ["razon_social"])
        return attrs

    def create(self, validated_data):
        cliente = validated_data.get("cliente")
        if cliente is None:
            cliente = Cliente.objects.create(tipo=TipoCliente.EMPRESA)
            validated_data["cliente"] = cliente
        return super().create(validated_data)


class ClienteSerializer(serializers.ModelSerializer):
    persona = PersonaSerializer(read_only=True)
    empresa = EmpresaSerializer(read_only=True)
    direcciones = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ["id", "tipo", "persona", "empresa", "direcciones"]

    def get_direcciones(self, obj):
        return DireccionSerializer(obj.direccion_set.all(), many=True).data


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = ["id", "nombre", "velocidad", "precio"]

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


class VentaSerializer(serializers.ModelSerializer):
    cliente_detalle = ClienteSerializer(source="cliente", read_only=True)
    producto_detalle = ProductoSerializer(source="producto", read_only=True)
    flujo_detalle = FlujoSerializer(source="flujo", read_only=True)
    promociones = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Promocion.objects.all(), required=False
    )
    promociones_detalle = PromocionSerializer(
        source="promociones", many=True, read_only=True
    )
    pasos = serializers.SerializerMethodField()
    creado_por = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Venta
        fields = [
            "id",
            "cliente",
            "cliente_detalle",
            "fecha",
            "producto",
            "producto_detalle",
            "flujo",
            "flujo_detalle",
            "promociones",
            "promociones_detalle",
            "estado",
            "pasos",
            "creado_por",
        ]
        read_only_fields = ["fecha", "creado_por"]

    def validate(self, attrs):
        cliente = attrs.get("cliente") or getattr(self.instance, "cliente", None)
        flujo = attrs.get("flujo") or getattr(self.instance, "flujo", None)
        if cliente and flujo and flujo.tipo_cliente != cliente.tipo:
            raise serializers.ValidationError(
                {
                    "flujo": "El flujo no corresponde al tipo de cliente. "
                    "Usa un flujo de persona natural (RUC 10) o de empresa (RUC 20)."
                }
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
