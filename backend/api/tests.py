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
        flujo = Flujo.objects.create(nombre="Instalacion", tipo_cliente=TipoCliente.PERSONA)
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

    def test_create_empresa_creates_cliente_juridico(self):
        persona = self.client.post(
            "/api/personas/",
            {
                "tipo_documento": "DNI",
                "numero_documento": "87654321",
                "nombres": "Luis",
                "apellidos": "Rojas",
                "distrito_nacimiento": "Lima",
                "padre": "Pedro",
                "madre": "Ana",
                "celular": "999888777",
            },
            format="json",
        )
        response = self.client.post(
            "/api/empresas/",
            {
                "ruc": "20123456789",
                "razon_social": "Empresa SAC",
                "representante_legal": persona.data["id"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cliente = Cliente.objects.get(id=response.data["cliente"])
        self.assertEqual(cliente.tipo, TipoCliente.EMPRESA)

    def test_venta_rejects_flujo_of_other_client_type(self):
        cliente = Cliente.objects.create(tipo=TipoCliente.EMPRESA)
        producto = Producto.objects.create(nombre="Fibra 200", velocidad=200, precio=80)
        flujo = Flujo.objects.create(nombre="Flujo ruc 10", tipo_cliente=TipoCliente.PERSONA)

        response = self.client.post(
            "/api/ventas/",
            {"cliente": cliente.id, "producto": producto.id, "flujo": flujo.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_venta_flujo_rebuilds_steps(self):
        cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
        producto = Producto.objects.create(nombre="Fibra 100", velocidad=100, precio=70)
        flujo_a = Flujo.objects.create(nombre="Flujo A", tipo_cliente=TipoCliente.PERSONA)
        flujo_b = Flujo.objects.create(nombre="Flujo B", tipo_cliente=TipoCliente.PERSONA)
        paso = Paso.objects.create(nombre="Validacion", descripcion="Validar")
        extra = Paso.objects.create(nombre="Instalacion", descripcion="Instalar")
        FlujoPaso.objects.create(flujo=flujo_a, paso=paso, orden=1)
        FlujoPaso.objects.create(flujo=flujo_b, paso=paso, orden=1)
        FlujoPaso.objects.create(flujo=flujo_b, paso=extra, orden=2)

        created = self.client.post(
            "/api/ventas/",
            {"cliente": cliente.id, "producto": producto.id, "flujo": flujo_a.id},
            format="json",
        )
        self.assertEqual(len(created.data["pasos"]), 1)

        updated = self.client.patch(
            f"/api/ventas/{created.data['id']}/",
            {"flujo": flujo_b.id},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(len(updated.data["pasos"]), 2)
        self.assertEqual(updated.data["flujo"], flujo_b.id)

    def test_delete_flujo_paso_used_by_venta(self):
        cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
        producto = Producto.objects.create(nombre="Fibra 50", velocidad=50, precio=40)
        flujo = Flujo.objects.create(nombre="Flujo", tipo_cliente=TipoCliente.PERSONA)
        paso_uno = Paso.objects.create(nombre="Uno", descripcion="Uno")
        paso_dos = Paso.objects.create(nombre="Dos", descripcion="Dos")
        primero = FlujoPaso.objects.create(flujo=flujo, paso=paso_uno, orden=1)
        FlujoPaso.objects.create(flujo=flujo, paso=paso_dos, orden=2)

        self.client.post(
            "/api/ventas/",
            {"cliente": cliente.id, "producto": producto.id, "flujo": flujo.id},
            format="json",
        )

        response = self.client.delete(f"/api/flujo-pasos/{primero.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(list(flujo.flujopaso_set.order_by("orden").values_list("orden", "paso__nombre")), [(1, "Dos")])

    def test_add_flujo_paso_syncs_existing_venta(self):
        cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
        producto = Producto.objects.create(nombre="Fibra 80", velocidad=80, precio=55)
        flujo = Flujo.objects.create(nombre="Flujo sync", tipo_cliente=TipoCliente.PERSONA)
        paso_uno = Paso.objects.create(nombre="Uno", descripcion="Uno")
        paso_dos = Paso.objects.create(nombre="Dos", descripcion="Dos")
        FlujoPaso.objects.create(flujo=flujo, paso=paso_uno, orden=1)

        created = self.client.post(
            "/api/ventas/",
            {"cliente": cliente.id, "producto": producto.id, "flujo": flujo.id},
            format="json",
        )
        self.assertEqual(len(created.data["pasos"]), 1)

        self.client.post(
            "/api/flujo-pasos/",
            {"flujo": flujo.id, "paso": paso_dos.id, "orden": 2},
            format="json",
        )
        detalle = self.client.get(f"/api/ventas/{created.data['id']}/")
        self.assertEqual(len(detalle.data["pasos"]), 2)
        self.assertEqual(
            [paso["flujo_paso_detalle"]["paso_detalle"]["nombre"] for paso in detalle.data["pasos"]],
            ["Uno", "Dos"],
        )
