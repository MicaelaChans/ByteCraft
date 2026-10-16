// src/services/api.js
//
// Único punto de contacto entre React y el backend PHP.
// - Todas las rutas son relativas a /api (en desarrollo Vite las redirige a
//   Apache con un proxy; en Docker Apache sirve todo desde el mismo dominio).
// - credentials: "include" hace que viaje la cookie de sesión (httpOnly).
// - Si la API responde un error, se lanza ApiError con el mensaje del backend
//   y, si los hay, los errores por campo (detalles) para mostrarlos en el form.

const BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(mensaje, status, detalles = {}) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

async function pedir(metodo, ruta, cuerpo) {
  const opciones = {
    method: metodo,
    credentials: "include",
    headers: {},
  };
  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  let res;
  try {
    res = await fetch(`${BASE}/${ruta}`, opciones);
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisá tu conexión.", 0);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // respuesta sin JSON (no debería pasar)
  }

  if (!res.ok || !json?.ok) {
    throw new ApiError(json?.error || `Error ${res.status}`, res.status, json?.detalles || {});
  }
  return json.data;
}

/** Arma una query string ignorando los valores vacíos. */
export function qs(params) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  get: (ruta) => pedir("GET", ruta),
  post: (ruta, cuerpo = {}) => pedir("POST", ruta, cuerpo),
  put: (ruta, cuerpo = {}) => pedir("PUT", ruta, cuerpo),
  delete: (ruta) => pedir("DELETE", ruta),
  url: (ruta) => `${BASE}/${ruta}`,
};

export default api;
