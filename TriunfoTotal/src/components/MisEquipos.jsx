import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Cargando, MensajeError } from "./partials/Cargando";
import api from "../services/api";
import "../css/styles.css";

// Módulo de gestión de participantes y equipos (del lado del usuario).
function MisEquipos() {
  const user = useSelector((state) => state.user);
  const [equipos, setEquipos] = useState(null);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [aviso, setAviso] = useState(null);
  const [miembroNuevo, setMiembroNuevo] = useState({});

  const cargar = useCallback(() => {
    api.get("equipos/mios").then(setEquipos).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function accion(fn, ok) {
    setAviso(null);
    try {
      await fn();
      setAviso({ tipo: "success", texto: ok });
      cargar();
      return true;
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
      return false;
    }
  }

  async function crear(e) {
    e.preventDefault();
    if (nuevo.trim().length < 3) {
      setAviso({ tipo: "danger", texto: "El nombre del equipo debe tener al menos 3 caracteres." });
      return;
    }
    if (await accion(() => api.post("equipos", { nombre: nuevo.trim() }), "Equipo creado. Sos el capitán.")) setNuevo("");
  }

  async function agregar(e, idEquipo) {
    e.preventDefault();
    const texto = (miembroNuevo[idEquipo] || "").trim();
    if (!texto) return;
    if (await accion(() => api.post(`equipos/${idEquipo}/miembros`, { usuario: texto }), "Miembro agregado.")) {
      setMiembroNuevo((m) => ({ ...m, [idEquipo]: "" }));
    }
  }

  function renombrar(eq) {
    const nombre = window.prompt("Nuevo nombre del equipo:", eq.nombre);
    if (nombre && nombre.trim() !== eq.nombre) {
      accion(() => api.put(`equipos/${eq.id_equipo}`, { nombre: nombre.trim() }), "Nombre actualizado.");
    }
  }

  if (error) return <div className="container py-5"><MensajeError error={error} onReintentar={cargar} /></div>;
  if (!equipos) return <Cargando />;

  return (
    <div className="container py-4">
      <h1 className="fs-2">Mis equipos</h1>
      <p className="text-body-secondary">
        Creá un equipo, sumá integrantes por su email o alias, y como capitán inscribilo en torneos por equipos.
        Para torneos individuales no hace falta equipo: te inscribís directamente.
      </p>

      {aviso && <div className={`alert alert-${aviso.tipo}`}>{aviso.texto}</div>}

      <form className="d-flex gap-2 mb-4" onSubmit={crear}>
        <input className="form-control" placeholder="Nombre del nuevo equipo" maxLength={100}
               value={nuevo} onChange={(e) => setNuevo(e.target.value)} aria-label="Nombre del nuevo equipo" />
        <button className="btn miColor text-nowrap" type="submit"><i className="bi bi-plus-lg me-1"></i>Crear equipo</button>
      </form>

      {equipos.length === 0 && <p className="tournaments-empty">Todavía no sos parte de ningún equipo.</p>}

      <div className="tt-grid">
        {equipos.map((eq) => {
          const soyCapitan = eq.rol_en_equipo === "Capitan";
          return (
            <div key={eq.id_equipo} className="tt-equipo-card">
              <div className="d-flex justify-content-between align-items-start">
                <h5 className="mb-1">{eq.nombre}</h5>
                {soyCapitan && (
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => renombrar(eq)} title="Renombrar">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" title="Eliminar equipo"
                            onClick={() => window.confirm(`¿Eliminar "${eq.nombre}"?`) &&
                              accion(() => api.delete(`equipos/${eq.id_equipo}`), "Equipo eliminado.")}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                )}
              </div>
              <span className={`badge ${soyCapitan ? "text-bg-warning" : "text-bg-secondary"} mb-2`}>
                {soyCapitan ? "Sos capitán" : "Jugador"}
              </span>

              <ul className="list-unstyled mb-2">
                {eq.miembros.map((m) => (
                  <li key={m.id_usuario} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span>
                      {m.nombre} {m.apellido} {m.alias && <small className="text-body-secondary">@{m.alias}</small>}
                      {m.rol_en_equipo === "Capitan" && <i className="bi bi-star-fill text-warning ms-1" title="Capitán"></i>}
                    </span>
                    {m.rol_en_equipo !== "Capitan" && (soyCapitan || m.id_usuario === user.id_usuario) && (
                      <button className="btn btn-sm btn-link text-danger p-0"
                              onClick={() => accion(() => api.delete(`equipos/${eq.id_equipo}/miembros/${m.id_usuario}`),
                                m.id_usuario === user.id_usuario ? "Saliste del equipo." : "Miembro quitado.")}>
                        {m.id_usuario === user.id_usuario ? "Salir" : "Quitar"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {soyCapitan && (
                <form className="d-flex gap-2" onSubmit={(e) => agregar(e, eq.id_equipo)}>
                  <input className="form-control form-control-sm" placeholder="Email o alias"
                         value={miembroNuevo[eq.id_equipo] || ""} aria-label="Email o alias del nuevo miembro"
                         onChange={(e) => setMiembroNuevo((m) => ({ ...m, [eq.id_equipo]: e.target.value }))} />
                  <button className="btn btn-sm btn-outline-primary text-nowrap" type="submit">Agregar</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MisEquipos;
