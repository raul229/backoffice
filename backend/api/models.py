from django.conf import settings
from django.db import models


class TipoCliente(models.TextChoices):
    PERSONA = "PERSONA", "Persona Natural"
    EMPRESA = "EMPRESA", "Persona Juridica"

class Cliente(models.Model):
    tipo = models.CharField(max_length=20, choices=TipoCliente.choices)
    
    @property
    def nombre(self):
        if self.tipo == TipoCliente.PERSONA:
            return f"{self.persona.nombres} {self.persona.apellidos}"

        if self.tipo == TipoCliente.EMPRESA:
            return self.empresa.razon_social

        return self.tipo + " - " + str(self.id)
    
    def __str__(self):
        return self.nombre
    
    
class TipoDocumento(models.TextChoices):
    DNI = "DNI", "DNI"
    CE = "CE", "Carne de Extranjeria"


class Persona(models.Model):
    cliente =models.OneToOneField(Cliente, on_delete=models.CASCADE)
    tipo_documento = models.CharField(max_length=20, choices=TipoDocumento.choices)
    numero_documento = models.CharField(max_length=9)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    distrito_nacimiento = models.CharField(max_length=100, blank=True)
    padre = models.CharField(max_length=100, blank=True)
    madre = models.CharField(max_length=100, blank=True)
    celular = models.CharField(max_length=9)
    
    def __str__(self):
        return f"{self.nombres} {self.apellidos}"
    
    
class Empresa(models.Model):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE)
    ruc = models.CharField(max_length=11)
    razon_social = models.CharField(max_length=100)
    representante_legal = models.ForeignKey(Persona, on_delete=models.PROTECT)
    
class TipoDireccion(models.TextChoices):
    JIRON = "JIRON", "Jiron"
    AVENIDA = "AVENIDA", "Avenida"
    CALLE = "CALLE", "Calle"
    PASAJE = "PASAJE", "Pasaje"
    
    
class Direccion(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TipoDireccion.choices)
    direccion = models.CharField(max_length=200)
    numero = models.CharField(max_length=10)
    distrito = models.CharField(max_length=100)
    urbanizacion = models.CharField(max_length=100, blank=True)
    manzana = models.CharField(max_length=10, blank=True)
    lote = models.CharField(max_length=10, blank=True)
    interior = models.CharField(max_length=20, blank=True)
    referencia = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "cliente",
                    "tipo",
                    "direccion",
                    "numero",
                    "distrito",
                    "urbanizacion",
                    "manzana",
                    "lote",
                    "interior",
                    
                ],
                name="unique_direccion_cliente",
            )
        ]
    
class Promocion(models.Model):
    nombre = models.CharField(max_length=100)
    #descuento = models.DecimalField(max_digits=5, decimal_places=2, default=0.30)
    descripcion = models.TextField()
    #bono = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return self.nombre
    
class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    velocidad = models.PositiveBigIntegerField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    tipo_cliente = models.CharField(
        max_length=20, choices=TipoCliente.choices, default=TipoCliente.PERSONA
    )
    
    def __str__(self):
        return self.nombre + " - " + str(self.velocidad) + " Mbps - S/." + str(self.precio)
    
class EstadoPaso(models.TextChoices):
    PENDIENTE = "PENDIENTE", "Pendiente"
    EN_PROCESO = "EN_PROCESO", "En proceso"
    OBSERVADO = "OBSERVADO", "Observado"
    SUBSANANDO = "SUBSANANDO", "Subsanando"
    APROBADO = "APROBADO", "Aprobado"
    RECHAZADO = "RECHAZADO", "Rechazado"

class Paso(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    
    def __str__(self):
        return self.nombre

class Flujo(models.Model):
    nombre = models.CharField(max_length=100)
    tipo_cliente = models.CharField(max_length=20, choices=TipoCliente.choices)
    pasos = models.ManyToManyField(Paso, through="FlujoPaso")
    
    def __str__(self):
        return self.nombre
    
class FlujoPaso(models.Model):
    flujo = models.ForeignKey(Flujo, on_delete=models.PROTECT)
    paso = models.ForeignKey(Paso, on_delete=models.PROTECT)
    orden = models.PositiveIntegerField()
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['flujo', 'paso'],
                name='unique_flujo_paso'
                
                
            ),
            models.UniqueConstraint(
                fields=['flujo', 'orden'],
                name='unique_flujo_orden'
            )
        ] 
    
    
class PromocionVenta(models.Model):
    promocion = models.ForeignKey(Promocion, on_delete=models.CASCADE)
    venta = models.ForeignKey('Venta', on_delete=models.CASCADE)
    
    class Meta:
        constraints = [
        models.UniqueConstraint(
            fields=["venta", "promocion"],
            name="unique_venta_promocion"
        )
        ]
    

class EstadoVenta(models.TextChoices):
    EN_PROCESO = "EN_PROCESO", "En proceso"
    INSTALADO = "INSTALADO", "Instalado"
    ANULADO = "ANULADO", "Anulado"


class Venta(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT)
    direccion = models.ForeignKey(
        Direccion,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="ventas",
    )
    fecha = models.DateTimeField(auto_now_add=True)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    flujo=models.ForeignKey(Flujo, on_delete=models.PROTECT)
    promociones = models.ManyToManyField(Promocion, through=PromocionVenta)
    estado = models.CharField(max_length=20, choices=EstadoVenta.choices, default=EstadoVenta.EN_PROCESO)
    psi = models.CharField(max_length=50, blank=True)
    siro = models.CharField(max_length=50, blank=True)
    numero_oportunidad = models.CharField(max_length=50, blank=True)
    oit = models.CharField(max_length=50, blank=True)
    cotizacion = models.CharField(max_length=50, blank=True)
    contrato = models.CharField(max_length=50, blank=True)
    numero_fijo = models.CharField(max_length=20, blank=True)
    numero_orden = models.CharField(max_length=50, blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ventas",
    )

    class Meta:
        permissions = [
            ("view_all_ventas", "Puede ver todas las ventas"),
            ("change_venta_codigos", "Puede editar códigos de seguimiento de una venta"),
            ("reasignar_venta", "Puede reasignar ventas a otro asesor"),
        ]
    
class VentaPaso(models.Model):
    venta=models.ForeignKey(Venta, on_delete=models.CASCADE)
    flujo_paso=models.ForeignKey(FlujoPaso, on_delete=models.CASCADE)
    estado=models.CharField(max_length=20, choices=EstadoPaso.choices, default=EstadoPaso.PENDIENTE)


class VentaComentario(models.Model):
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name="comentarios")
    texto = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="comentarios_venta",
    )

    class Meta:
        ordering = ["fecha"]
    

