import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateProfile } from "../redux/userSlice";
import { maskEmail, maskPhone } from "../utils/maskData";
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

    try {
      // Cuando exista el backend reemplazar por el PUT correspondiente
      await new Promise((resolve) => setTimeout(resolve, 500));

      dispatch(updateProfile(formData));

      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  return (
  <div className="profile-page">
    <div className="container profile-container">

      <div className="profile-card">

        {/* Banner */}
        <div className="profile-banner"></div>

        {!editMode ? (
          <>
            <div className="row align-items-center px-4 py-5">

              {/* FOTO */}
              <div className="col-lg-3 text-center">
                <img
                  src={formData.avatar || "/img/login2.png"}
                  alt="Foto de perfil"
                  className="profile-avatar"
                />
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
                  className="btn btn-light profile-edit-btn"
                  onClick={() => setEditMode(true)}
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>

              </div>

            </div>
          </>
        ) : (

          <form
            onSubmit={handleSave}
            className="profile-form mt-4"
          >

            <div className="text-center mb-4">

              <img
                src={formData.avatar || "/img/login2.png"}
                alt="Foto de perfil"
                className="profile-avatar"
              />

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
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  hidden
                />

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
                  className="form-control"
                  value={formData.nombre}
                  onChange={handleChange}
                />

              </div>

              <div className="col-md-6 mb-3">

                <label className="form-label">
                  Apellido
                </label>

                <input
                  type="text"
                  name="apellido"
                  className="form-control"
                  value={formData.apellido}
                  onChange={handleChange}
                />

              </div>

              <div className="col-md-6 mb-3">

                <label className="form-label">
                  Alias
                </label>

                <input
                  type="text"
                  name="alias"
                  className="form-control"
                  value={formData.alias}
                  onChange={handleChange}
                />

              </div>

              <div className="col-md-6 mb-3">

                <label className="form-label">
                  Teléfono
                </label>

                <input
                  type="tel"
                  name="telefono"
                  className="form-control"
                  value={formData.telefono}
                  onChange={handleChange}
                />

              </div>

              <div className="col-12 mb-4">

                <label className="form-label">
                  Dirección
                </label>

                <input
                  type="text"
                  name="direccion"
                  className="form-control"
                  value={formData.direccion}
                  onChange={handleChange}
                />

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
                className="btn btn-success"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
            <section className="container mt-3">
                <div>
                  <h2>Historial de Torneos</h2>
                  <div className="card" style={{ width: "18rem" }}>
                  <img src="..." className="card-img-top" alt="..."/>

                  <div className="card-body">
                  <h5 className="card-title">Card title</h5>
                  <p className="card-text"> Some quick example text to build on the card title and make up the bulk of the card’s content. </p>
                  <a href="#" className="btn btn-primary"> Go somewhere </a>
                  </div>
                </div>
                </div>
              </section>
          </form>
        )}

      </div>

    </div>
  </div>
)}

export default Profile;


