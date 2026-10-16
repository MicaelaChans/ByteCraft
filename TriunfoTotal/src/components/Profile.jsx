import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateProfile } from "../redux/userSlice";
import { maskEmail, maskPhone } from "../utils/maskData";
import TorneoCard from "./partials/TorneoCard";
import api from "../services/api";
import "../css/styles.css";

function Profile() {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    alias: "",
    telefono: "",
    direccion: "",
    avatar: "",
  });

  const [saving, setSaving] = useState(false);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [misTorneos, setMisTorneos] = useState({ organizados: [], participando: [] });
  const [pass, setPass] = useState({ actual: "", nueva: "", repetir: "" });
  const [avisoPass, setAvisoPass] = useState(null);

  // Historial: torneos que organizo y en los que participo (datos reales)
  useEffect(() => {
    if (user) api.get("perfil/torneos").then(setMisTorneos).catch(() => {});
  }, [user]);

  // Si no hay usuario logueado, redirige al login
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Precarga los datos cuando se entra al perfil
  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        alias: user.alias || "",
        telefono: user.telefono || "",
        direccion: user.direccion || "",
        avatar: user.avatar || "",
      });
    }
  }, [user, editMode]);

  if (!user) return null;

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handlePhotoClick() {
    fileInputRef.current.click();
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrores((prev) => ({ ...prev, avatar: "Elegí un archivo de imagen." }));
      return;
    }
    if (file.size > 1.4 * 1024 * 1024) {
      setErrores((prev) => ({ ...prev, avatar: "La imagen no puede pesar más de 1,4 MB." }));
      return;
    }
    setErrores((prev) => ({ ...prev, avatar: "" }));

    const reader = new FileReader();

    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        avatar: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e.preventDefault();

    setSaving(true);
    setErrores({});
    setAviso(null);

    try {
      const actualizado = await api.put("perfil", formData);
      dispatch(updateProfile(actualizado));
      setEditMode(false);
      setAviso({ tipo: "success", texto: "Perfil actualizado." });
    } catch (err) {
      setErrores(err.detalles || {});
      setAviso({ tipo: "danger", texto: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    setAvisoPass(null);
    if (pass.nueva !== pass.repetir) {
      setAvisoPass({ tipo: "danger", texto: "Las contraseñas nuevas no coinciden." });
      return;
    }
    try {
      await api.put("perfil/password", { actual: pass.actual, nueva: pass.nueva });
      setPass({ actual: "", nueva: "", repetir: "" });
      setAvisoPass({ tipo: "success", texto: "Contraseña actualizada." });
    } catch (err) {
      setAvisoPass({ tipo: "danger", texto: err.detalles?.nueva || err.detalles?.actual || err.message });
    }
  }

  return (
  <div className="profile-page">
    <div className="container profile-container">

      {aviso && <div className={`alert alert-${aviso.tipo}`}>{aviso.texto}</div>}

      <div className="profile-card">

        {/* Banner */}
        <div className="profile-banner"></div>

        {!editMode ? (
          <>
            <div className="row align-items-center px-4 py-5">

              {/* FOTO */}
              <div className="col-lg-3 text-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Foto de perfil"
                    className="profile-avatar"
                  />
                  ) : (
                    <i className="bi bi-person-circle profile-avatar-icon"></i>
                  )}
              </div>

              {/* DATOS */}
              <div className="col-lg-8">

                <h2 className="profile-name">
                  {user.nombre || "Sin nombre"} {user.apellido || ""}
                </h2>

                {user.alias && (
                  <p className="profile-alias">
                    @{user.alias}
                  </p>
                )}

                <div className="profile-info">

                  <div className="profile-info-row">
                    <span className="profile-info-label">
                      Email
                    </span>

                    <span>
                      {maskEmail(user.email)}
                    </span>
                  </div>

                  <div className="profile-info-row">
                    <span className="profile-info-label">
                      Teléfono
                    </span>

                    <span>
                      {user.telefono
                        ? maskPhone(user.telefono)
                        : "No cargado"}
                    </span>
                  </div>

                  <div className="profile-info-row">
                    <span className="profile-info-label">
                      Dirección
                    </span>

                    <span>
                      {user.direccion || "No cargada"}
                    </span>
                  </div>
                </div>
              </div>
              {/* BOTÓN EDITAR */}
              <div className="col-lg-1 text-end">

                <button
                  className="btn btn-light profile-edit-btn mt-5"
                  onClick={() => setEditMode(true)}
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>

                <button
                  className="btn btn-light profile-edit-btn mt-5"
                  onClick={() => navigate("/crear_torneo")}
                  title="Crear torneo"
                >
                  <i className="bi bi-trophy"></i>
                </button>

              </div>
            </div>
          </>
        ) : (

          <form
            onSubmit={handleSave}
            className="profile-form profile-edit-mode mt-4"
          >

            <div className="text-center mb-5">

              {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="Foto de perfil"
                className="profile-avatar"
                />
              ) : (
                <i className="bi bi-person-circle profile-avatar-icon"></i>
              )}

              <div className="mt-3">

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handlePhotoClick}
                >
                  Cambiar foto
                </button>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  hidden
                />
                {formData.avatar && (
                  <button type="button" className="btn btn-link text-danger"
                          onClick={() => setFormData((prev) => ({ ...prev, avatar: "" }))}>
                    Quitar foto
                  </button>
                )}
                {errores.avatar && <div className="text-danger small mt-1">{errores.avatar}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Nombre
                </label>

                <input
                  type="text"
                  name="nombre"
                  className={`form-control ${errores.nombre ? "is-invalid" : ""}`}
                  value={formData.nombre}
                  onChange={handleChange}
                />
                {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
              </div>

              <div className="col-md-6 mb-3">

                <label className="form-label">
                  Apellido
                </label>

                <input
                  type="text"
                  name="apellido"
                  className={`form-control ${errores.apellido ? "is-invalid" : ""}`}
                  value={formData.apellido}
                  onChange={handleChange}
                />
                {errores.apellido && <div className="invalid-feedback">{errores.apellido}</div>}

              </div>

              <div className="col-md-6 mb-3">

                <label className="form-label">
                  Alias
                </label>

                <input
                  type="text"
                  name="alias"
                  className={`form-control ${errores.alias ? "is-invalid" : ""}`}
                  value={formData.alias}
                  onChange={handleChange}
                />
                {errores.alias && <div className="invalid-feedback">{errores.alias}</div>}

              </div>

              <div className="col-md-6 mb-3">

                <label className="form-label">
                  Teléfono
                </label>

                <input
                  type="tel"
                  name="telefono"
                  className={`form-control ${errores.telefono ? "is-invalid" : ""}`}
                  value={formData.telefono}
                  onChange={handleChange}
                />
                {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}

              </div>

              <div className="col-12 mb-4">

                <label className="form-label">
                  Dirección
                </label>

                <input
                  type="text"
                  name="direccion"
                  className={`form-control ${errores.direccion ? "is-invalid" : ""}`}
                  value={formData.direccion}
                  onChange={handleChange}
                />
                {errores.direccion && <div className="invalid-feedback">{errores.direccion}</div>}

              </div>

            </div>

            <div className="d-flex justify-content-end gap-2">

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn miColor"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </div>

        
      <div className="profile-container mt-5">
        <div className="profile-card">
          <div className="profile-banner2"></div>
          <section className="py-4 px-3 px-md-4" id="sectionHistorial">
            <h2 className="text-center mb-4">Torneos que organizo</h2>
            {misTorneos.organizados.length === 0 ? (
              <p className="text-center text-body-secondary">
                Todavía no organizaste torneos.{" "}
                <button className="btn btn-link p-0 align-baseline" onClick={() => navigate("/crear_torneo")}>Crear uno</button>
              </p>
            ) : (
              <div className="tt-grid">
                {misTorneos.organizados.map((t) => (
                  <TorneoCard key={t.id_torneo} torneo={t} acciones={
                    <button className="btn btn-sm miColor" onClick={() => navigate(`/tournaments/${t.id_torneo}/gestionar`)}>
                      <i className="bi bi-gear me-1"></i>Gestionar
                    </button>
                  } />
                ))}
              </div>
            )}

            <h2 className="text-center my-4">Historial de Torneos</h2>
            {misTorneos.participando.length === 0 ? (
              <p className="text-center text-body-secondary">Todavía no participaste en torneos.</p>
            ) : (
              <div className="tt-grid">
                {misTorneos.participando.map((t) => <TorneoCard key={`${t.id_torneo}-${t.equipo}`} torneo={t} />)}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="profile-container mt-5 mb-5">
        <div className="profile-card px-3 px-md-4 py-4">
          <h2 className="fs-4 mb-3">Seguridad: cambiar contraseña</h2>
          {avisoPass && <div className={`alert alert-${avisoPass.tipo} py-2`}>{avisoPass.texto}</div>}
          <form className="row g-2" onSubmit={cambiarPassword}>
            <div className="col-md-4">
              <input type="password" className="form-control" placeholder="Contraseña actual" autoComplete="current-password"
                     value={pass.actual} onChange={(e) => setPass({ ...pass, actual: e.target.value })} aria-label="Contraseña actual" />
            </div>
            <div className="col-md-4">
              <input type="password" className="form-control" placeholder="Nueva contraseña" autoComplete="new-password"
                     value={pass.nueva} onChange={(e) => setPass({ ...pass, nueva: e.target.value })} aria-label="Nueva contraseña" />
            </div>
            <div className="col-md-4">
              <input type="password" className="form-control" placeholder="Repetir nueva" autoComplete="new-password"
                     value={pass.repetir} onChange={(e) => setPass({ ...pass, repetir: e.target.value })} aria-label="Repetir nueva contraseña" />
            </div>
            <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <small className="text-body-secondary">Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
              <button className="btn btn-outline-primary" type="submit"
                      disabled={!pass.actual || !pass.nueva}>Cambiar contraseña</button>
            </div>
          </form>
        </div>
      </div>
  </div>
  </div>
)}

export default Profile;


