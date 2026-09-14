const API_URL = import.meta.env.VITE_API_URL ?? "/api";

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  const token = csrfToken();
  if (token) {
    headers["X-CSRFToken"] = token;
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:required"));
  }
  if (response.status === 403 && !path.startsWith("/auth/")) {
    try {
      const data = await response.clone().json();
      if (String(data.detail || "").includes("Authentication credentials")) {
        window.dispatchEvent(new Event("auth:required"));
      }
    } catch {
      /* ignore */
    }
  }

  if (!response.ok) {
    const fallbackMessage =
      response.statusText || "No se pudo completar la solicitud";
    let message;
    try {
      const data = await response.json();
      message =
        data.detail ||
        Object.entries(data)
          .map(
            ([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
          )
          .join(" | ");
    } catch {
      message = fallbackMessage;
    }
    throw new Error(message || fallbackMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getCsrf() {
  return request("/auth/csrf/");
}

export function login(username, password) {
  return request("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request("/auth/logout/", { method: "POST" });
}

export function getMe() {
  return request("/auth/me/");
}

export function changePassword(payload) {
  return request("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPermissionCatalog() {
  return request("/auth/permissions/");
}

export function getRoles() {
  return request("/auth/roles/");
}

export function createRole(payload) {
  return request("/auth/roles/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRole(id, payload) {
  return request(`/auth/roles/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id) {
  return request(`/auth/roles/${id}/`, {
    method: "DELETE",
  });
}

export function getUsers() {
  return request("/auth/users/");
}

export function createUser(payload) {
  return request("/auth/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id, payload) {
  return request(`/auth/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id) {
  return request(`/auth/users/${id}/`, {
    method: "DELETE",
  });
}

export function lookupRuc(ruc) {
  return request(`/lookup/ruc/?ruc=${encodeURIComponent(ruc)}`);
}

export function lookupDireccion(query) {
  return request(`/lookup/direccion/?q=${encodeURIComponent(query)}`);
}

export function getChoices() {
  return request("/choices/");
}

export function getProductos() {
  return request("/productos/");
}

export function getPromociones() {
  return request("/promociones/");
}

export function createProducto(payload) {
  return request("/productos/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProducto(id, payload) {
  return request(`/productos/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProducto(id) {
  return request(`/productos/${id}/`, {
    method: "DELETE",
  });
}

export function createPromocion(payload) {
  return request("/promociones/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePromocion(id, payload) {
  return request(`/promociones/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deletePromocion(id) {
  return request(`/promociones/${id}/`, {
    method: "DELETE",
  });
}

export function getFlujos() {
  return request("/flujos/");
}

export function getPasos() {
  return request("/pasos/");
}

export function createPaso(payload) {
  return request("/pasos/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePaso(id, payload) {
  return request(`/pasos/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deletePaso(id) {
  return request(`/pasos/${id}/`, {
    method: "DELETE",
  });
}

export function createFlujo(payload) {
  return request("/flujos/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFlujo(id, payload) {
  return request(`/flujos/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFlujo(id) {
  return request(`/flujos/${id}/`, {
    method: "DELETE",
  });
}

export function createFlujoPaso(payload) {
  return request("/flujo-pasos/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteFlujoPaso(id) {
  return request(`/flujo-pasos/${id}/`, {
    method: "DELETE",
  });
}

export function getVentas() {
  return request("/ventas/");
}

export function getVenta(id) {
  return request(`/ventas/${id}/`);
}

export function getClientes() {
  return request("/clientes/");
}

export function createPersona(payload) {
  return request("/personas/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createEmpresa(payload) {
  return request("/empresas/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createDireccion(payload) {
  return request("/direcciones/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createVenta(payload) {
  return request("/ventas/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVenta(id, payload) {
  return request(`/ventas/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteVenta(id) {
  return request(`/ventas/${id}/`, {
    method: "DELETE",
  });
}

export function deleteCliente(id) {
  return request(`/clientes/${id}/`, {
    method: "DELETE",
  });
}

export function updateVentaPaso(id, payload) {
  return request(`/venta-pasos/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
