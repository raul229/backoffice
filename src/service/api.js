let csrfFromApi = "";

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : csrfFromApi;
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

  const response = await fetch(`/api${path}`, {
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

export async function getCsrf() {
  const response = await request("/auth/csrf/");
  csrfFromApi = response.csrfToken ?? "";
  return response;
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

export function getAsesores() {
  return request("/asesores/");
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

export function reorderFlujoPasos(flujoId, ids) {
  return request(`/flujos/${flujoId}/reordenar-pasos/`, {
    method: "PATCH",
    body: JSON.stringify({ ids }),
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

export function updatePersona(id, payload) {
  return request(`/personas/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateCliente(id, payload) {
  return request(`/clientes/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createEmpresa(payload) {
  return request("/empresas/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEmpresa(id, payload) {
  return request(`/empresas/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createDireccion(payload) {
  return request("/direcciones/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDireccion(id, payload) {
  return request(`/direcciones/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDireccion(id) {
  return request(`/direcciones/${id}/`, {
    method: "DELETE",
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

export function createVentaComentario(payload) {
  return request("/venta-comentarios/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function filenameFromDisposition(header, fallback) {
  if (!header) return fallback
  const encoded = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"(.*)"$/, "$1"))
    } catch {
      /* ignore */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(header)
  return plain ? plain[1].trim() : fallback
}

export async function generarContrato(ventaId, opciones = {}) {
  const payload = typeof opciones === "string" ? { fecha: opciones } : opciones
  const headers = { "Content-Type": "application/json" }
  const token = csrfToken()
  if (token) headers["X-CSRFToken"] = token
  const response = await fetch(`/api/ventas/${ventaId}/generar-contrato/`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      ...(payload.fecha ? { fecha: payload.fecha } : {}),
      ...(payload.direccion != null ? { direccion: payload.direccion } : {}),
    }),
  })
  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:required"))
  }
  if (!response.ok) {
    let message = response.statusText || "No se pudo generar el contrato"
    try {
      const data = await response.json()
      message =
        data.detail ||
        Object.entries(data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join(" · ") ||
        message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  const blob = await response.blob()
  return {
    blob,
    filename: filenameFromDisposition(
      response.headers.get("Content-Disposition"),
      `contratos-${ventaId}.zip`,
    ),
  }
}

export function getPlantillasContrato() {
  return request("/plantillas-contrato/")
}

export async function uploadPlantillaContrato(clave, file) {
  const headers = {}
  const token = csrfToken()
  if (token) headers["X-CSRFToken"] = token
  const body = new FormData()
  body.append("archivo", file)
  const response = await fetch(`/api/plantillas-contrato/${clave}/`, {
    method: "POST",
    credentials: "include",
    headers,
    body,
  })
  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:required"))
  }
  if (!response.ok) {
    let message = response.statusText || "No se pudo cargar la plantilla"
    try {
      const data = await response.json()
      message =
        data.detail ||
        data.archivo ||
        Object.entries(data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join(" · ") ||
        message
    } catch {
      /* ignore */
    }
    throw new Error(Array.isArray(message) ? message.join(", ") : message)
  }
  return response.json()
}

export async function downloadPlantillaContrato(clave, fallbackName) {
  const headers = {}
  const token = csrfToken()
  if (token) headers["X-CSRFToken"] = token
  const response = await fetch(`/api/plantillas-contrato/${clave}/archivo/`, {
    credentials: "include",
    headers,
  })
  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:required"))
  }
  if (!response.ok) {
    let message = response.statusText || "No se pudo descargar la plantilla"
    try {
      const data = await response.json()
      message = data.detail || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  const blob = await response.blob()
  return {
    blob,
    filename: filenameFromDisposition(response.headers.get("Content-Disposition"), fallbackName),
  }
}
