import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cargando } from "./partials/Cargando";
import api from "../services/api";
import "../css/styles.css";

const VACIO = {
  nombre: "",
  id_disciplina: "",
  formato: "",
  modalidad: "Equipos",
  tipo: "Informal",
  fecha_inicio: "",
  fecha_fin: "",
  max_equipos: "8",
  descripcion: "",
  puntos_victoria: "3",
  puntos_empate: "1",
  puntos_derrota: "0",
  ida_y_vuelta: false,
  rondas_suizo: "",
};

// Formulario para CREAR un torneo (/crear_torneo) o EDITARLO (/tournaments/:id/editar).
// Cualquier usuario logueado puede organizar (roles dinámicos).
function CrearTorneo() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(VACIO);
  const [disciplinas, setDisciplinas] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cargando, setCargando] = useState(editando);

  useEffect(() => {
    api.get("disciplinas").then(setDisciplinas).catch(() => {});
    api.get("modulos").then(setModulos).catch(() => {});
  }, []);

  // Si estamos editando, precargamos el torneo
  useEffect(() => {
    if (!editando) return;
    api.get(`torneos/${id}`)
      .then(({ torneo }) => {
        const f = {};
        Object.keys(VACIO).forEach((k) => { f[k] = torneo[k] ?? ""; });
        f.ida_y_vuelta = Boolean(Number(torneo.ida_y_vuelta));
        setForm(f);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [editando, id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrores((prev) => ({ ...prev, [name]: "" }));
  }

  // Validación en el FRONTEND (rápida, para el usuario). El backend vuelve a validar todo.
  function validar() {
    const e = {};
    if (form.nombre.trim().length < 3) e.nombre = "El nombre debe tener al menos 3 caracteres.";
    if (!form.id_disciplina) e.id_disciplina = "Elegí una disciplina.";
    if (!form.formato) e.formato = "Elegí un formato de competencia.";
    const max = Number(form.max_equipos);
    if (!Number.isInteger(max) || max < 2 || max > 128) e.max_equipos = "Entre 2 y 128 participantes.";
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      e.fecha_fin = "No puede ser anterior a la fecha de inicio.";
    }
    if (Number(form.puntos_victoria) <= Number(form.puntos_empate)) {
      e.puntos_victoria = "La victoria tiene que valer más que el empate.";
    }
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError("");
    const e = validar();
    if (Object.keys(e).length) {
      setErrores(e);
      return;
    }
    setSaving(true);
    try {
      if (editando) {
        await api.put(`torneos/${id}`, form);
        navigate(`/tournaments/${id}/gestionar`);
      } else {
        const r = await api.post("torneos", form);
        navigate(`/tournaments/${r.torneo.id_torneo}/gestionar`, { state: { mensaje: r.mensaje } });
      }
    } catch (err) {
      setError(err.message);
      setErrores(err.detalles || {});
    } finally {
      setSaving(false);
    }
  }

  if (cargando) return <Cargando />;

  const campo = (name) => `form-control ${errores[name] ? "is-invalid" : ""}`;
  const select = (name) => `form-select ${errores[name] ? "is-invalid" : ""}`;
  const ErrorCampo = ({ name }) => (errores[name] ? <div className="invalid-feedback">{errores[name]}</div> : null);

  return (
    <div className="profile-page">
      <div className="container profile-container">
        <div className="profile-card">
          <div className="profile-banner"></div>

          <div className="px-3 px-md-4 py-5">
            <h2 className="profile-name text-center mb-5">{editando ? "Editar torneo" : "Crear Torneo"}</h2>

            <div className="row justify-content-center">
              <div className="col-lg-8">
                <form onSubmit={handleSubmit} className="profile-form" noValidate>
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label" htmlFor="nombre">Nombre del torneo</label>
                    <input id="nombre" type="text" name="nombre" className={campo("nombre")} maxLength={100}
                           placeholder="Ej: Copa Verano 2026" value={form.nombre} onChange={handleChange} />
                    <ErrorCampo name="nombre" />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="id_disciplina">Disciplina</label>
                      <select id="id_disciplina" name="id_disciplina" className={select("id_disciplina")}
                              value={form.id_disciplina} onChange={handleChange}>
                        <option value="">Seleccionar...</option>
                        {disciplinas.map((d) => (
                          <option key={d.id_disciplina} value={d.id_disciplina}>{d.nombre} ({d.categoria})</option>
                        ))}
                      </select>
                      <ErrorCampo name="id_disciplina" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="formato">Formato</label>
                      <select id="formato" name="formato" className={select("formato")} value={form.formato} onChange={handleChange}>
                        <option value="">Seleccionar...</option>
                        {modulos.map((m) => (
                          <option key={m.codigo} value={m.codigo} disabled={!Number(m.habilitado)}>
                            {m.nombre}{!Number(m.habilitado) ? " (deshabilitado)" : ""}
                          </option>
                        ))}
                      </select>
                      <ErrorCampo name="formato" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="modalidad">Modalidad</label>
                      <select id="modalidad" name="modalidad" className={select("modalidad")} value={form.modalidad} onChange={handleChange}>
                        <option value="Equipos">Por equipos</option>
                        <option value="Individual">Individual (ej: ajedrez, 1 vs 1)</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="tipo">Tipo de torneo</label>
                      <select id="tipo" name="tipo" className={select("tipo")} value={form.tipo} onChange={handleChange}>
                        <option value="Informal">Informal (se publica al instante)</option>
                        <option value="Formal">Formal (lo aprueba un administrador)</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="fecha_inicio">Fecha de inicio</label>
                      <input id="fecha_inicio" type="date" name="fecha_inicio" className={campo("fecha_inicio")}
                             value={form.fecha_inicio} onChange={handleChange} />
                      <ErrorCampo name="fecha_inicio" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="fecha_fin">Fecha de finalización</label>
                      <input id="fecha_fin" type="date" name="fecha_fin" className={campo("fecha_fin")}
                             value={form.fecha_fin} onChange={handleChange} />
                      <ErrorCampo name="fecha_fin" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="max_equipos">Máximo de participantes</label>
                      <input id="max_equipos" type="number" name="max_equipos" min="2" max="128" className={campo("max_equipos")}
                             value={form.max_equipos} onChange={handleChange} />
                      <ErrorCampo name="max_equipos" />
                    </div>

                    {form.formato === "Liga" && (
                      <div className="col-md-6 mb-3 d-flex align-items-end">
                        <div className="form-check">
                          <input id="ida_y_vuelta" type="checkbox" name="ida_y_vuelta" className="form-check-input"
                                 checked={form.ida_y_vuelta} onChange={handleChange} />
                          <label className="form-check-label" htmlFor="ida_y_vuelta">Ida y vuelta</label>
                        </div>
                      </div>
                    )}

                    {form.formato === "Suizo" && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="rondas_suizo">Cantidad de rondas (opcional)</label>
                        <input id="rondas_suizo" type="number" name="rondas_suizo" min="1" max="20" className={campo("rondas_suizo")}
                               placeholder="Automático: log2(participantes)" value={form.rondas_suizo ?? ""} onChange={handleChange} />
                        <ErrorCampo name="rondas_suizo" />
                      </div>
                    )}
                  </div>

                  {form.formato !== "Eliminacion" && (
                    <fieldset className="row border rounded-3 p-2 mx-0 mb-3">
                      <legend className="fs-6 w-auto px-2">Puntos</legend>
                      {[["puntos_victoria", "Victoria"], ["puntos_empate", "Empate"], ["puntos_derrota", "Derrota"]].map(([n, t]) => (
                        <div className="col-4 mb-2" key={n}>
                          <label className="form-label small" htmlFor={n}>{t}</label>
                          <input id={n} type="number" min="0" max="10" name={n} className={campo(n)} value={form[n]} onChange={handleChange} />
                          <ErrorCampo name={n} />
                        </div>
                      ))}
                    </fieldset>
                  )}

                  <div className="mb-4">
                    <label className="form-label" htmlFor="descripcion">Descripción (opcional)</label>
                    <textarea id="descripcion" name="descripcion" className={campo("descripcion")} rows="3" maxLength={2000}
                              placeholder="Reglas, sede, premios u otra información del torneo"
                              value={form.descripcion ?? ""} onChange={handleChange} />
                    <ErrorCampo name="descripcion" />
                  </div>

                  {form.tipo === "Formal" && (
                    <div className="alert alert-warning small">
                      Los torneos <strong>formales</strong> quedan pendientes hasta que un administrador los apruebe.
                      Si cambiás un torneo a formal, vuelve a necesitar aprobación.
                    </div>
                  )}

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={saving}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn miColor" disabled={saving}>
                      {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear torneo"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrearTorneo;
