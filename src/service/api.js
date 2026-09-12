const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const fallbackMessage =
      response.statusText || "No se pudo completar la solicitud";
    let message;
    try {
      const data = await response.json();
      message = Object.entries(data)
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
    console.log("No content");
    return null;
  }

  return response.json();
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

export function createFlujo(payload) {
  return request("/flujos/", {
    method: "POST",
    body: JSON.stringify(payload),
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

export function updateVentaPaso(id, payload) {
  return request(`/venta-pasos/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
