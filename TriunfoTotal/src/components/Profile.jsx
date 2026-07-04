import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateProfile } from "../redux/userSlice";
import { maskEmail, maskPhone } from "../utils/maskData";
import "../css/profile.css";

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
    avatar: "",
  });
  const [saving, setSaving] = useState(false);

  // si no hay usuario logueado, no tiene sentido mostrar esta página
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // precarga el form con los datos actuales cada vez que se entra en modo edición
  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        alias: user.alias || "",
        telefono: user.telefono || "",
        avatar: user.avatar || "",
      });
    }
  }, [user, editMode]);

  if (!user) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhotoClick() {
    fileInputRef.current.click();
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // esto solo genera una vista previa local (base64) en el navegador.
    // TODO: cuando esté el backend, subir el archivo real, ej:
    // const data = new FormData(); data.append("avatar", file);
    // await axios.post("http://localhost/api/upload_avatar.php", data);
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // TODO: reemplazar por la llamada real cuando esté el backend PHP:
      // await axios.put("http://localhost/api/profile.php", formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      dispatch(updateProfile(formData));
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar-wrap">
          <img
            src={formData.avatar || "/img/login2.png"}
            alt="Foto de perfil"
            className="profile-avatar"
          />
          {editMode && (
            <>
              <button
                type="button"
                className="profile-avatar-edit"
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
            </>
          )}
        </div>

        {!editMode ? (
          <>
            <h1 className="fs-3 mt-3 mb-0">
              {user.nombre || "Sin nombre"} {user.apellido || ""}
            </h1>
            {user.alias && <p className="profile-alias">@{user.alias}</p>}

            <div className="profile-info">
              <div className="profile-info-row">
                <span className="profile-info-label">Email</span>
                <span>{maskEmail(user.email)}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Teléfono</span>
                <span>{user.telefono ? maskPhone(user.telefono) : "No cargado"}</span>
              </div>
            </div>

            <p className="profile-hint">
              Así ven tu email y teléfono los demás usuarios. Vos, al estar
              logueado, podés ver y editar tus datos completos abajo.
            </p>

            <div className="profile-info profile-info-full">
              <div className="profile-info-row">
                <span className="profile-info-label">Email completo</span>
                <span>{user.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Teléfono completo</span>
                <span>{user.telefono || "No cargado"}</span>
              </div>
            </div>

            <button
              className="btn btn-primary mt-4"
              onClick={() => setEditMode(true)}
            >
              Editar perfil
            </button>
          </>
        ) : (
          <form onSubmit={handleSave} className="w-100 mt-3">
            <div className="row">
              <div className="col-6 mb-3">
                <label htmlFor="nombre" className="form-label">
                  Nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  className="form-control"
                  value={formData.nombre}
                  onChange={handleChange}
                />
              </div>
              <div className="col-6 mb-3">
                <label htmlFor="apellido" className="form-label">
                  Apellido
                </label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  className="form-control"
                  value={formData.apellido}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="alias" className="form-label">
                Alias
              </label>
              <input
                type="text"
                id="alias"
                name="alias"
                className="form-control"
                value={formData.alias}
                onChange={handleChange}
                placeholder="Como querés que te vean en los torneos"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="telefono" className="form-label">
                Teléfono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                className="form-control"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="099123456"
              />
            </div>

            <div className="d-flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditMode(false)}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Profile;