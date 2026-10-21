import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { fechaHora } from "../../utils/formato";

// Campanita del navbar: muestra avisos (inscripciones, aprobaciones, partidos...)
function Notificaciones() {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ notificaciones: [], no_leidas: 0 });
  const ref = useRef(null);

  const cargar = useCallback(() => {
    api.get("notificaciones").then(setDatos).catch(() => {});
  }, []);

  // Carga inicial y refresco cada 60 segundos
  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  useEffect(() => {
    function fuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  async function abrir(n) {
    if (!n.leida) {
      await api.put(`notificaciones/${n.id_notificacion}/leida`).catch(() => {});
      cargar();
    }
    setAbierto(false);
    if (n.referencia_tipo === "torneo" && n.referencia_id) navigate(`/tournaments/${n.referencia_id}`);
    if (n.referencia_tipo === "aprobacion") navigate("/admin?pestana=pendientes");
    if (n.referencia_tipo === "equipo") navigate("/equipos");
    if (n.referencia_tipo === "usuario" && n.referencia_id) navigate(`/usuarios/${n.referencia_id}`);
  }

  async function leerTodas() {
    await api.put("notificaciones/leer-todas").catch(() => {});
    cargar();
  }

  return (
    <div className="tt-notif" ref={ref}>
      <button
        type="button"
        className="tt-notif-btn"
        onClick={() => { setAbierto((v) => !v); if (!abierto) cargar(); }}
        aria-label={`Notificaciones (${datos.no_leidas} sin leer)`}
      >
        <i className="bi bi-bell-fill"></i>
        {datos.no_leidas > 0 && <span className="tt-notif-badge">{datos.no_leidas > 9 ? "9+" : datos.no_leidas}</span>}
      </button>

      {abierto && (
        <div className="tt-notif-panel">
          <div className="tt-notif-header">
            <strong>Notificaciones</strong>
            {datos.no_leidas > 0 && (
              <button className="btn btn-link btn-sm p-0" onClick={leerTodas}>Marcar todas como leídas</button>
            )}
          </div>
          {datos.notificaciones.length === 0 ? (
            <p className="tt-notif-vacio">No tenés notificaciones.</p>
          ) : (
            <ul className="tt-notif-lista">
              {datos.notificaciones.map((n) => (
                <li key={n.id_notificacion}>
                  <button className={`tt-notif-item ${n.leida ? "" : "no-leida"}`} onClick={() => abrir(n)}>
                    <span>{n.mensaje}</span>
                    <small>{fechaHora(n.creado_en)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Notificaciones;
