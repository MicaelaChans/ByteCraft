import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import TablaPosiciones from "./partials/TablaPosiciones";
import { Cargando, MensajeError } from "./partials/Cargando";
import api from "../services/api";
import { FORMATOS, claseEstado, textoEstado, aInputFechaHora } from "../utils/formato";
import "../css/styles.css";

const EXPLICACION = {
  Liga: "Se genera el fixture completo (todos contra todos) con el método del círculo.",
  Eliminacion: "Se sortea la llave. Si los participantes no son potencia de 2, algunos pasan directo (BYE).",
  Suizo: "Se sortea la ronda 1. Las siguientes se emparejan por puntos, sin repetir rivales.",
};

// Fila editable de un partido (cargar resultado / programar fecha)
function PartidoEditor({ partido, onGuardado, editable }) {
  const [gl, setGl] = useState(partido.goles_local ?? "");
  const [gv, setGv] = useState(partido.goles_visita ?? "");
  const [fecha, setFecha] = useState(aInputFechaHora(partido.fecha_partido));
  const [estado, setEstado] = useState(null);

  if (partido.id_equipo_visita === null) {
    return (
      <div className="tt-partido">
        <span className="tt-partido-equipos"><strong>{partido.equipo_local}</strong> — libre / pasa directo (BYE)</span>
      </div>
    );
  }

  async function guardar(e) {
    e.preventDefault();
    if (gl === "" || gv === "" || Number(gl) < 0 || Number(gv) < 0) {
      setEstado({ tipo: "danger", texto: "Cargá ambos resultados (números ≥ 0)." });
      return;
    }
    setEstado({ tipo: "secondary", texto: "Guardando..." });
    try {
      await api.put(`partidos/${partido.id_partido}`, {
        goles_local: Number(gl),
        goles_visita: Number(gv),
        fecha_partido: fecha || null,
      });
      setEstado({ tipo: "success", texto: "Guardado ✓" });
      onGuardado();
    } catch (err) {
      setEstado({ tipo: "danger", texto: err.message });
    }
  }

  return (
    <form className="tt-partido" onSubmit={guardar}>
      <span className="tt-partido-equipos">
        {partido.equipo_local} <span className="text-body-secondary">vs</span> {partido.equipo_visita}
        {partido.estado === "Finalizado" && <i className="bi bi-check-circle-fill text-success ms-2" title="Finalizado"></i>}
      </span>
      <div className="tt-partido-form">
        <input type="number" min="0" className="form-control form-control-sm" value={gl} disabled={!editable}
               onChange={(e) => setGl(e.target.value)} aria-label={`Resultado ${partido.equipo_local}`} />
        <span>-</span>
        <input type="number" min="0" className="form-control form-control-sm" value={gv} disabled={!editable}
               onChange={(e) => setGv(e.target.value)} aria-label={`Resultado ${partido.equipo_visita}`} />
        <input type="datetime-local" className="form-control form-control-sm tt-partido-fecha" value={fecha} disabled={!editable}
               onChange={(e) => setFecha(e.target.value)} aria-label="Fecha y hora" />
        {editable && <button className="btn btn-sm miColor" type="submit">Guardar</button>}
      </div>
      {estado && <small className={`text-${estado.tipo} w-100`}>{estado.texto}</small>}
    </form>
  );
}

function GestionarTorneo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const esAdmin = user?.roles?.includes("Administrador");

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(location.state?.mensaje ? { tipo: "success", texto: location.state.mensaje } : null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(() => {
    api.get(`torneos/${id}`)
      .then((d) => {
        if (!d.permisos.puede_gestionar) {
          navigate(`/tournaments/${id}`, { replace: true });
          return;
        }
        setDatos(d);
      })
      .catch((e) => setError(e.message));
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  // Ejecuta una acción, muestra el resultado y recarga
  async function accion(fn, okTexto) {
    setTrabajando(true);
    setAviso(null);
    try {
      const r = await fn();
      setAviso({ tipo: "success", texto: r?.mensaje || okTexto });
      cargar();
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
    } finally {
      setTrabajando(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function buscarEquipos(e) {
    e.preventDefault();
    if (busqueda.trim().length < 2) return;
    try {
      const eqs = await api.get(`equipos?q=${encodeURIComponent(busqueda)}`);
      const individual = datos.torneo.modalidad === "Individual";
      setResultados(eqs.filter((eq) => Boolean(Number(eq.es_individual)) === individual));
    } catch (err) {
      setAviso({ tipo: "danger", texto: err.message });
    }
  }

  async function eliminarTorneo() {
    if (!window.confirm("¿Eliminar el torneo? Esta acción no se puede deshacer.")) return;
    try {
      await api.delete(`torneos/${id}`);
      navigate("/profile");
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
    }
  }

  if (error) return <div className="container py-5"><MensajeError error={error} onReintentar={cargar} /></div>;
  if (!datos) return <Cargando />;

  const { torneo, inscripciones, rondas, posiciones } = datos;
  const aceptados = inscripciones.filter((i) => i.estado_inscripcion === "Aceptada").length;
  const borrador = torneo.estado_torneo === "Borrador";
  const terminado = torneo.estado_torneo === "Finalizado";

  return (
    <div className="container py-4 tt-gestion">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <span className={`status-badge ${claseEstado(torneo)}`}>{textoEstado(torneo)}</span>
          <h1 className="fs-2 mt-2 mb-1">{torneo.nombre}</h1>
          <p className="text-body-secondary mb-0">
            {torneo.disciplina} · {FORMATOS[torneo.formato]} · {torneo.modalidad} · {torneo.tipo}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to={`/tournaments/${id}`} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-eye me-1"></i>Ver página pública
          </Link>
          {borrador && (
            <Link to={`/tournaments/${id}/editar`} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-pencil me-1"></i>Editar
            </Link>
          )}
          {(borrador || esAdmin) && (
            <button className="btn btn-outline-danger btn-sm" onClick={eliminarTorneo}>
              <i className="bi bi-trash me-1"></i>Eliminar
            </button>
          )}
        </div>
      </div>

      {aviso && <div className={`alert alert-${aviso.tipo}`}>{aviso.texto}</div>}

      {torneo.estado_aprobacion === "Pendiente" && (
        <div className="alert alert-warning">
          Esperando aprobación de un administrador. Mientras tanto nadie puede inscribirse.
        </div>
      )}
      {torneo.estado_aprobacion === "Rechazado" && (
        <div className="alert alert-danger">
          Rechazado por un administrador: <strong>{torneo.motivo_rechazo}</strong>. Editalo para corregirlo: al guardar vuelve a revisión (o pasalo a informal).
        </div>
      )}

      {borrador ? (
        <div className="row g-4">
          <div className="col-lg-8">
            <section className="my-tournaments-section">
              <h2 className="fs-5">Inscripciones ({aceptados}/{torneo.max_equipos} aceptadas)</h2>
              {inscripciones.length === 0 ? (
                <p className="text-body-secondary">Todavía nadie pidió inscribirse.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr><th>Participante</th><th>Miembros</th><th>Estado</th><th className="text-end">Acciones</th></tr>
                    </thead>
                    <tbody>
                      {inscripciones.map((i) => (
                        <tr key={i.id_equipo}>
                          <td>{i.nombre}</td>
                          <td>{i.cantidad_miembros}</td>
                          <td>
                            <span className={`badge ${i.estado_inscripcion === "Aceptada" ? "text-bg-success"
                              : i.estado_inscripcion === "Pendiente" ? "text-bg-warning" : "text-bg-secondary"}`}>
                              {i.estado_inscripcion}
                            </span>
                          </td>
                          <td className="text-end text-nowrap">
                            {i.estado_inscripcion !== "Aceptada" && (
                              <button className="btn btn-sm btn-success me-1" disabled={trabajando}
                                      onClick={() => accion(() => api.put(`torneos/${id}/inscripciones/${i.id_equipo}`, { estado: "Aceptada" }))}>
                                Aceptar
                              </button>
                            )}
                            {i.estado_inscripcion === "Pendiente" && (
                              <button className="btn btn-sm btn-outline-secondary me-1" disabled={trabajando}
                                      onClick={() => accion(() => api.put(`torneos/${id}/inscripciones/${i.id_equipo}`, { estado: "Rechazada" }))}>
                                Rechazar
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline-danger" disabled={trabajando} title="Quitar"
                                    onClick={() => accion(() => api.delete(`torneos/${id}/inscripciones/${i.id_equipo}`))}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {torneo.estado_aprobacion === "Aprobado" && (
              <section className="my-tournaments-section">
                <h2 className="fs-5">Inscribir participantes directamente</h2>
                <form className="d-flex gap-2" onSubmit={buscarEquipos}>
                  <input className="form-control" placeholder={`Buscar ${torneo.modalidad === "Individual" ? "participante" : "equipo"} por nombre...`}
                         value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar equipo" />
                  <button className="btn btn-outline-primary" type="submit">Buscar</button>
                </form>
                {resultados.length > 0 && (
                  <ul className="list-group mt-2">
                    {resultados.map((eq) => (
                      <li key={eq.id_equipo} className="list-group-item d-flex justify-content-between align-items-center">
                        {eq.nombre}
                        <button className="btn btn-sm miColor" disabled={trabajando}
                                onClick={() => accion(() => api.post(`torneos/${id}/inscripciones`, { id_equipo: eq.id_equipo, directo: true }))}>
                          Inscribir
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          <div className="col-lg-4">
            <div className="tournament-detail-sidebar">
              <h5>Iniciar el torneo</h5>
              <p className="small">{EXPLICACION[torneo.formato]}</p>
              <p className="small">
                Las solicitudes que sigan pendientes se rechazarán automáticamente y ya no se podrán inscribir más participantes.
              </p>
              <button className="btn btn-primary w-100" disabled={trabajando || torneo.estado_aprobacion !== "Aprobado" || aceptados < 2}
                      onClick={() => window.confirm("¿Iniciar el torneo y generar los enfrentamientos?") &&
                        accion(() => api.post(`torneos/${id}/iniciar`))}>
                <i className="bi bi-play-fill me-1"></i>Iniciar y generar enfrentamientos
              </button>
              {aceptados < 2 && <p className="small text-body-secondary mt-2">Necesitás al menos 2 participantes aceptados.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-8">
            {terminado && torneo.campeon && (
              <div className="tt-campeon">
                <i className="bi bi-trophy-fill"></i>
                <div><small>Campeón</small><strong>{torneo.campeon}</strong></div>
              </div>
            )}
            {rondas.map((r) => {
              const abierta = r.estado !== "Cerrada";
              const editable = !terminado ? abierta || esAdmin : esAdmin;
              const pendientes = r.partidos.filter((p) => p.estado !== "Finalizado").length;
              return (
                <section key={r.id_ronda} className={`my-tournaments-section ${abierta ? "tt-ronda-abierta" : ""}`}>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                    <h2 className="fs-5 mb-0">
                      {r.nombre}{" "}
                      <span className={`badge ${abierta ? "text-bg-success" : "text-bg-secondary"}`}>{abierta ? "Abierta" : "Cerrada"}</span>
                    </h2>
                    {abierta && (
                      <button className="btn btn-sm btn-primary" disabled={trabajando || pendientes > 0}
                              title={pendientes > 0 ? `Faltan ${pendientes} resultado(s)` : "Cerrar ronda"}
                              onClick={() => accion(() => api.post(`rondas/${r.id_ronda}/cerrar`))}>
                        <i className="bi bi-lock me-1"></i>Cerrar ronda {pendientes > 0 && `(faltan ${pendientes})`}
                      </button>
                    )}
                  </div>
                  {r.partidos.map((p) => (
                    <PartidoEditor key={`${p.id_partido}-${p.estado}-${p.goles_local}-${p.goles_visita}`}
                                   partido={p} editable={editable} onGuardado={cargar} />
                  ))}
                  {!abierta && esAdmin && <p className="small text-body-secondary mb-0">Como administrador podés corregir resultados de rondas cerradas.</p>}
                </section>
              );
            })}
          </div>
          <div className="col-lg-4">
            {torneo.formato !== "Eliminacion" && (
              <div className="tournament-detail-sidebar">
                <h5>Posiciones</h5>
                <TablaPosiciones posiciones={posiciones} />
              </div>
            )}
            {!terminado && (
              <div className="alert alert-info small mt-3">
                Cargá los resultados y después <strong>cerrá la ronda</strong>.
                {torneo.formato !== "Liga" && " Al cerrarla se genera automáticamente la ronda siguiente."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionarTorneo;
