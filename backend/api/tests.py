from rest_framework import status
from rest_framework.test import APITestCase

from .models import Cliente, Flujo, FlujoPaso, Paso, Producto, Promocion, TipoCliente


class ApiEndpointsTests(APITestCase):
    def test_choices_endpoint_returns_frontend_options(self):
        response = self.client.get("/api/choices/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tipos_cliente", response.data)
        self.assertIn({"value": TipoCliente.PERSONA, "label": "Persona Natural"}, response.data["tipos_cliente"])

    def test_create_persona_creates_cliente_when_missing(self):
        response = self.client.post(
            "/api/personas/",
            {
                "tipo_documento": "DNI",
                "numero_documento": "12345678",
                "nombres": "Ana",
                "apellidos": "Perez",
                "distrito_nacimiento": "Lima",
                "padre": "Carlos",
                "madre": "Maria",
                "celular": "987654321",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cliente = Cliente.objects.get(id=response.data["cliente"])
        self.assertEqual(cliente.tipo, TipoCliente.PERSONA)

    def test_create_venta_generates_workflow_steps(self):
        cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
        producto = Producto.objects.create(nombre="Fibra 500", velocidad=500, precio=99)
        promocion = Promocion.objects.create(nombre="Promo", descripcion="Instalacion gratis")
        flujo = Flujo.objects.create(nombre="Instalacion")
        paso_uno = Paso.objects.create(nombre="Validacion", descripcion="Validar datos")
        paso_dos = Paso.objects.create(nombre="Instalacion", descripcion="Instalar servicio")
        FlujoPaso.objects.create(flujo=flujo, paso=paso_uno, orden=1)
        FlujoPaso.objects.create(flujo=flujo, paso=paso_dos, orden=2)

        response = self.client.post(
            "/api/ventas/",
            {
                "cliente": cliente.id,
                "producto": producto.id,
                "flujo": flujo.id,
                "promociones": [promocion.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["pasos"]), 2)
        self.assertEqual(response.data["promociones"], [promocion.id])
