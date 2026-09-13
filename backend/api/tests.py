from django.contrib.auth.models import Group, User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Cliente, Flujo, FlujoPaso, Paso, Producto, Promocion, TipoCliente


class ApiEndpointsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser("tester", "tester@test.com", "pass")
        self.client.force_authenticate(self.user)
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


    def test_user_only_sees_own_ventas(self):
        grupo = Group.objects.get(name="Asesor")
        ana = User.objects.create_user("ana_venta", password="secret")
        luis = User.objects.create_user("luis_venta", password="secret")
        ana.groups.add(grupo)
        luis.groups.add(grupo)

        cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
        producto = Producto.objects.create(nombre="Fibra 10", velocidad=10, precio=20)
        flujo = Flujo.objects.create(nombre="Flujo propio", tipo_cliente=TipoCliente.PERSONA)
        paso = Paso.objects.create(nombre="Uno", descripcion="Uno")
        FlujoPaso.objects.create(flujo=flujo, paso=paso, orden=1)

        self.client.force_authenticate(ana)
        created = self.client.post(
            "/api/ventas/",
            {"cliente": cliente.id, "producto": producto.id, "flujo": flujo.id},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["creado_por"], ana.id)

        self.client.force_authenticate(luis)
        lista = self.client.get("/api/ventas/")
        self.assertEqual(lista.status_code, status.HTTP_200_OK)
        self.assertEqual(lista.data, [])
        detalle = self.client.get(f"/api/ventas/{created.data['id']}/")
        self.assertEqual(detalle.status_code, status.HTTP_404_NOT_FOUND)

        supervisor = User.objects.create_user("super_venta", password="secret")
        supervisor.groups.add(Group.objects.get(name="Supervisor"))
        self.client.force_authenticate(supervisor)
        todas = self.client.get("/api/ventas/")
        self.assertEqual(len(todas.data), 1)


class AuthAndPermissionsTests(APITestCase):
    def test_login_and_me(self):
        User.objects.create_user("loginuser", password="secret123")
        response = self.client.post(
            "/api/auth/login/",
            {"username": "loginuser", "password": "secret123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "loginuser")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)

    def test_anonymous_cannot_list_ventas(self):
        response = self.client.get("/api/ventas/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_asesor_cannot_delete_flujo_paso(self):
        group = Group.objects.get(name="Asesor")
        user = User.objects.create_user("ana", password="secret")
        user.groups.add(group)
        self.client.force_authenticate(user)

        flujo = Flujo.objects.create(nombre="Flujo", tipo_cliente=TipoCliente.PERSONA)
        paso = Paso.objects.create(nombre="Uno", descripcion="Uno")
        flujo_paso = FlujoPaso.objects.create(flujo=flujo, paso=paso, orden=1)

        response = self.client.delete(f"/api/flujo-pasos/{flujo_paso.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_role_and_user(self):
        admin = User.objects.create_superuser("roleadmin", "role@test.com", "pass")
        self.client.force_authenticate(admin)

        catalog = self.client.get("/api/auth/permissions/")
        self.assertEqual(catalog.status_code, status.HTTP_200_OK)
        self.assertTrue(catalog.data)

        created = self.client.post(
            "/api/auth/roles/",
            {"name": "Auditor", "permissions": ["api.view_venta", "api.view_all_ventas"]},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertIn("api.view_all_ventas", created.data["permissions"])

        user = self.client.post(
            "/api/auth/users/",
            {
                "username": "auditor1",
                "password": "secret123",
                "first_name": "Ada",
                "groups": [created.data["id"]],
            },
            format="json",
        )
        self.assertEqual(user.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.data["groups"], ["Auditor"])
        self.assertTrue(user.data["is_active"])

    def test_rename_and_delete_user(self):
        admin = User.objects.create_superuser("renameadmin", "r@test.com", "pass")
        other = User.objects.create_user("viejo", password="secret")
        self.client.force_authenticate(admin)

        renamed = self.client.patch(
            f"/api/auth/users/{other.id}/",
            {"username": "nuevo", "first_name": "Ana"},
            format="json",
        )
        self.assertEqual(renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(renamed.data["username"], "nuevo")
        self.assertEqual(renamed.data["first_name"], "Ana")

        blocked = self.client.delete(f"/api/auth/users/{admin.id}/")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)

        deleted = self.client.delete(f"/api/auth/users/{other.id}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

    def test_rename_flujo_and_delete_venta(self):
        admin = User.objects.create_superuser("flujoadmin", "f@test.com", "pass")
        self.client.force_authenticate(admin)
        cliente = Cliente.objects.create(tipo=TipoCliente.PERSONA)
        producto = Producto.objects.create(nombre="Fibra 10", velocidad=10, precio=20)
        flujo = Flujo.objects.create(nombre="Original", tipo_cliente=TipoCliente.PERSONA)
        paso = Paso.objects.create(nombre="Uno", descripcion="Uno")
        FlujoPaso.objects.create(flujo=flujo, paso=paso, orden=1)

        renamed = self.client.patch(
            f"/api/flujos/{flujo.id}/",
            {"nombre": "Flujo persona"},
            format="json",
        )
        self.assertEqual(renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(renamed.data["nombre"], "Flujo persona")

        paso_renamed = self.client.patch(
            f"/api/pasos/{paso.id}/",
            {"nombre": "Validación"},
            format="json",
        )
        self.assertEqual(paso_renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(paso_renamed.data["nombre"], "Validación")

        created = self.client.post(
            "/api/ventas/",
            {"cliente": cliente.id, "producto": producto.id, "flujo": flujo.id},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        blocked_flujo = self.client.delete(f"/api/flujos/{flujo.id}/")
        self.assertEqual(blocked_flujo.status_code, status.HTTP_400_BAD_REQUEST)

        deleted = self.client.delete(f"/api/ventas/{created.data['id']}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)

        deleted_flujo = self.client.delete(f"/api/flujos/{flujo.id}/")
        self.assertEqual(deleted_flujo.status_code, status.HTTP_204_NO_CONTENT)
