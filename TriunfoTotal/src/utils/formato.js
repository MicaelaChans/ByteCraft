// src/utils/formato.js — textos y fechas para mostrar en pantalla

export const FORMATOS = {
  Liga: "Liga (todos contra todos)",
  Eliminacion: "Eliminación directa",
  Suizo: "Sistema suizo",
};

export function fecha(valor) {
  if (!valor) return "—";
  const d = new Date(String(valor).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fechaHora(valor) {
  if (!valor) return "—";
  const d = new Date(String(valor).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString("es-UY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** "2026-10-16 18:30:00" -> "2026-10-16T18:30" (para <input type="datetime-local">) */
export function aInputFechaHora(valor) {
  if (!valor) return "";
  return String(valor).replace(" ", "T").slice(0, 16);
}

/** Clase de color del badge según el estado del torneo. */
export function claseEstado(torneo) {
  if (torneo.estado_aprobacion === "Pendiente") return "status-pending";
  if (torneo.estado_aprobacion === "Rechazado") return "status-rejected";
  if (torneo.estado_torneo === "En Proceso") return "status-live";
  if (torneo.estado_torneo === "Finalizado") return "status-finished";
  return "status-open";
}

export function textoEstado(torneo) {
  if (torneo.estado_aprobacion === "Pendiente") return "Pendiente de aprobación";
  if (torneo.estado_aprobacion === "Rechazado") return "Rechazado";
  if (torneo.estado_torneo === "En Proceso") return "En curso";
  if (torneo.estado_torneo === "Finalizado") return "Finalizado";
  return "Inscripciones abiertas";
}
