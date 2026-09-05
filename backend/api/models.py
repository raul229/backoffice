from django.db import models


class TipoCliente(models.TextChoices):
    PERSONA = "PERSONA", "Persona Natural"
    EMPRESA = "EMPRESA", "Persona Jurudica"

class Cliente(models.Model):
    tipo = models.CharField(max_length=20, choices=TipoCliente.choices)
    
    
class TipoDocumento(models.TextChoices):
    DNI = "DNI", "DNI"
    CE = "CE", "Carne de Extranjeria"


class Persona(models.Model):
    cliente =models.OneToOneField(Cliente, on_delete=models.CASCADE)
    tipo_documento = models.CharField(max_length=20, choices=TipoDocumento.choices)
    numero_documento = models.CharField(max_length=9)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    distrito_nacimiento = models.CharField(max_length=100)
    padre = models.CharField(max_length=100)
    madre = models.CharField(max_length=100)
    celular = models.CharField(max_length=9)
    
    
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
    urbanizacion = models.CharField(max_length=100, blank=True, null=True)
    manzana = models.CharField(max_length=10, blank=True, null=True)
    lote = models.CharField(max_length=10, blank=True, null=True)
    referencia = models.CharField(max_length=200, blank=True, null=True)
    
class Promocion(models.Model):
    nombre = models.CharField(max_length=100)
    descuento = models.DecimalField(max_digits=5, decimal_places=2, default=0.30)
    descripcion = models.TextField()
    
class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    velocidad = models.IntegerField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    promocion = models.ForeignKey(Promocion, on_delete=models.SET_NULL, null=True, blank=True)
    
class Paso(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    orden = models.IntegerField()

class Flujo(models.Model):
    nombre = models.CharField(max_length=100)
    pasos = models.ManyToManyField(Paso, through='FlujoPaso')
    
class Venta(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    fecha = models.DateTimeField(auto_now_add=True)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    

