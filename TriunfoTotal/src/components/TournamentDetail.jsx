import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Footer from "./partials/Footer";
import Llave from "./partials/Llave";
import TablaPosiciones from "./partials/TablaPosiciones";
import { Cargando, MensajeError } from "./partials/Cargando";
import api from "../services/api";
import { FORMATOS, claseEstado, textoEstado, fecha, fechaHora } from "../utils/formato";
import "../css/styles.css";

// Página pública de un torneo: info, fixture/llave, posiciones y participantes.
function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [misEquipos, setMisEquipos] = useState([]);
  const [equipoElegido, setEquipoElegido] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    setError("");
    api.get(`torneos/${id}`).then(setDatos).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Para inscribir un equipo hay que ser su capitán
  useEffect(() => {
    if (user && datos?.torneo.modalidad === "Equipos" && datos.permisos.puede_inscribirse) {
      api.get("equipos/mios")
        .then((eqs) => setMisEquipos(eqs.filter((e) => e.rol_en_equipo === "Capitan")))
        .catch(() => {});
    }
  }, [user, datos]);

  async function inscribirme() {
    if (!user) {
      navigate("/login", { state: { desde: `/tournaments/${id}` } });
      return;
    }
    setEnviando(true);
    setMensaje(null);
    try {
      const cuerpo = datos.torneo.modalidad === "Equipos" ? { id_equipo: Number(equipoElegido) } : {};
      const r = await api.post(`torneos/${id}/inscripciones`, cuerpo);
      setMensaje({ tipo: "success", texto: r.mensaje });
      cargar();
    } catch (e) {
      setMensaje({ tipo: "danger", texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  async function retirarme() {
    if (!window.confirm("¿Seguro que querés retirar la inscripción?")) return;
    try {
      await api.delete(`torneos/${id}/inscripciones/${datos.permisos.mi_inscripcion.id_equipo}`);
      setMensaje({ tipo: "success", texto: "Inscripción retirada." });
      cargar();
    } catch (e) {
      setMensaje({ tipo: "danger", texto: e.message });
    }
  }

  if (error) {
    return (
      <div className="container py-5">
        <MensajeError error={error} onReintentar={cargar} />
        <Link to="/tournaments">← Volver a Torneos</Link>
      </div>
    );
  }
  if (!datos) return <Cargando />;

  const { torneo, inscripciones, rondas, posiciones, permisos } = datos;
  const aceptados = inscripciones.filter((i) => i.estado_inscripcion === "Aceptada");
  const miEquipo = permisos.mi_inscripcion?.id_equipo;

  return (
    <>
      <div className="tournament-detail-hero">
        <img src={torneo.imagen} alt={torneo.disciplina} />
        <div className="tournament-detail-hero-overlay">
          <div className="container">
            <span className={`status-badge ${claseEstado(torneo)}`}>{textoEstado(torneo)}</span>
            {torneo.tipo === "Formal" && <span className="status-badge status-formal ms-2">Formal</span>}
            <h1>{torneo.nombre}</h1>
            <p className="mb-0">
              {torneo.disciplina} · {FORMATOS[torneo.formato]} · {torneo.modalidad}
            </p>
          </div>
        </div>
      </div>

      <div className="container tournament-detail-content">
        {torneo.estado_aprobacion === "Pendiente" && (
          <div className="alert alert-warning">
            Este torneo es <strong>formal</strong>: está esperando la aprobación de un administrador.
            Todavía no es visible para el público.
          </div>
        )}
        {torneo.estado_aprobacion === "Rechazado" && (
          <div className="alert alert-danger">
            Un administrador rechazó este torneo. Motivo: <strong>{torneo.motivo_rechazo}</strong>
          </div>
        )}
        {torneo.campeon && (
          <div className="tt-campeon">
            <i className="bi bi-trophy-fill"></i>
            <div>
              <small>Campeón</small>
              <strong>{torneo.campeon}</strong>
            </div>
          </div>
        )}

        <div className="row">
          {/* Columna principal */}
          <div className="col-lg-8">
            <section className="my-tournaments-section">
              <h2 className="fs-4">Sobre el torneo</h2>
              <p>{torneo.descripcion || "El organizador no agregó una descripción."}</p>
            </section>

            {torneo.formato === "Eliminacion" ? (
              <section className="my-tournaments-section">
                <h2 className="fs-4">Llave</h2>
                <Llave rondas={rondas} />
              </section>
            ) : (
              <>
                <section className="my-tournaments-section">
                  <h2 className="fs-4">Tabla de posiciones</h2>
                  <TablaPosiciones posiciones={posiciones} resaltar={miEquipo ? [miEquipo] : []} />
                  <p className="small text-body-secondary mb-0">
                    Victoria {torneo.puntos_victoria} pts · Empate {torneo.puntos_empate} · Derrota {torneo.puntos_derrota}.
                    Desempate: diferencia y luego tantos a favor.
                  </p>
                </section>

                <section className="my-tournaments-section">
                  <h2 className="fs-4">Fixture y resultados</h2>
                  {rondas.length === 0 && (
                    <p className="text-body-secondary">El fixture se genera cuando el organizador inicia el torneo.</p>
                  )}
                  {rondas.map((r) => (
                    <div key={r.id_ronda} className="mb-3">
                      <h6 className="tt-ronda-titulo">
                        {r.nombre}
                        <span className={`badge ms-2 ${r.estado === "Cerrada" ? "text-bg-secondary" : "text-bg-success"}`}>
                          {r.estado === "Cerrada" ? "Cerrada" : "En juego"}
                        </span>
                      </h6>
                      <div className="leaderboard">
                        {r.partidos.map((p) => (
                          <div key={p.id_partido} className="leaderboard-row">
                            <div className="leaderboard-info">
                              {p.id_equipo_visita === null ? (
                                <strong>{p.equipo_local} <span className="fw-normal text-body-secondary">— libre (BYE)</span></strong>
                              ) : (
                                <strong>{p.equipo_local} vs {p.equipo_visita}</strong>
                              )}
                              {p.fecha_partido && <span className="mt-card-meta">{fechaHora(p.fecha_partido)}</span>}
                            </div>
                            <span className="leaderboard-points">
                              {p.id_equipo_visita === null ? "✓" : p.estado === "Finalizado" ? `${p.goles_local} - ${p.goles_visita}` : "vs"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              </>
            )}
          </div>

          {/* Columna lateral */}
          <div className="col-lg-4">
            <div className="tournament-detail-sidebar">
              <h5>Datos del torneo</h5>
              <div className="profile-info-row">
                <span className="profile-info-label">Organizador</span>
                <span>{torneo.organizador}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Inicio</span>
                <span>{fecha(torneo.fecha_inicio)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Fin</span>
                <span>{fecha(torneo.fecha_fin)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Cupos</span>
                <span>{torneo.inscriptos} / {torneo.max_equipos}</span>
              </div>
              {torneo.formato === "Liga" && (
                <div className="profile-info-row">
                  <span className="profile-info-label">Ida y vuelta</span>
                  <span>{Number(torneo.ida_y_vuelta) ? "Sí" : "No"}</span>
                </div>
              )}

              {mensaje && <div className={`alert alert-${mensaje.tipo} mt-3 py-2`}>{mensaje.texto}</div>}

              {permisos.mi_inscripcion && (
                <div className="alert alert-info mt-3 py-2">
                  Estás inscripto con <strong>{permisos.mi_inscripcion.nombre}</strong> —{" "}
                  {permisos.mi_inscripcion.estado_inscripcion}
                  {torneo.estado_torneo === "Borrador" && Number(permisos.mi_inscripcion.id_capitan) === user?.id_usuario && (
                    <button className="btn btn-link btn-sm p-0 ms-2" onClick={retirarme}>Retirarme</button>
                  )}
                </div>
              )}

              {permisos.puede_inscribirse && (
                <div className="mt-3">
                  {torneo.modalidad === "Equipos" && user && (
                    misEquipos.length ? (
                      <select className="form-select mb-2" value={equipoElegido} onChange={(e) => setEquipoElegido(e.target.value)}
                              aria-label="Equipo a inscribir">
                        <option value="">Elegí tu equipo...</option>
                        {misEquipos.map((e) => <option key={e.id_equipo} value={e.id_equipo}>{e.nombre}</option>)}
                      </select>
                    ) : (
                      <p className="small">
                        Necesitás ser capitán de un equipo. <Link to="/equipos">Creá uno acá</Link>.
                      </p>
                    )
                  )}
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    onClick={inscribirme}
                    disabled={enviando || (user && torneo.modalidad === "Equipos" && !equipoElegido)}
                  >
                    {enviando ? "Enviando..." : "Inscribirme"}
                  </button>
                </div>
              )}
              {!user && torneo.estado_torneo === "Borrador" && torneo.estado_aprobacion === "Aprobado" && (
                <button type="button" className="btn btn-primary w-100 mt-3" onClick={inscribirme}>
                  Iniciá sesión para inscribirte
                </button>
              )}

              {permisos.puede_gestionar && (
                <Link to={`/tournaments/${id}/gestionar`} className="btn miColor w-100 mt-3">
                  <i className="bi bi-gear me-2"></i>Gestionar torneo
                </Link>
              )}

              <h6 className="mt-4">Participantes ({aceptados.length})</h6>
              {aceptados.length === 0 ? (
                <p className="small text-body-secondary">Todavía no hay participantes aceptados.</p>
              ) : (
                <ul className="tournament-detail-participants">
                  {aceptados.map((i) => (
                    <li key={i.id_equipo} className={i.id_equipo === miEquipo ? "fw-bold" : ""}>{i.nombre}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <Link to="/tournaments" className="my-tournaments-link d-inline-block mt-3">
          ← Volver a Torneos
        </Link>
      </div>

      <Footer />
    </>
  );
}

export default TournamentDetail;
