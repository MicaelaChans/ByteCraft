import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../redux/userSlice";
import "../css/register.css";

function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio.";
    }

    if (!formData.apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio.";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Ingresá un email válido.";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (formData.password.length < 6) {
      newErrors.password = "Debe tener al menos 6 caracteres.";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      dispatch(login({ nombre: formData.nombre, email: formData.email }));
      navigate("/profile");
    } catch {
      setServerError("No se pudo completar el registro. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="fs-2 mb-4">Crear cuenta</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <div className="col-6 mb-3">
              <label htmlFor="nombre" className="form-label">
                Nombre
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                className={`form-control ${errors.nombre ? "is-invalid" : ""}`}
                value={formData.nombre}
                onChange={handleChange}
              />
              {errors.nombre && (
                <div className="invalid-feedback">{errors.nombre}</div>
              )}
            </div>

            <div className="col-6 mb-3">
              <label htmlFor="apellido" className="form-label">
                Apellido
              </label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                className={`form-control ${errors.apellido ? "is-invalid" : ""}`}
                value={formData.apellido}
                onChange={handleChange}
              />
              {errors.apellido && (
                <div className="invalid-feedback">{errors.apellido}</div>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              value={formData.email}
              onChange={handleChange}
              placeholder="tuemail@ejemplo.com"
            />
            {errors.email && (
              <div className="invalid-feedback">{errors.email}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            {errors.password && (
              <div className="invalid-feedback">{errors.password}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <div className="invalid-feedback">{errors.confirmPassword}</div>
            )}
          </div>

          {serverError && (
            <div className="alert alert-danger py-2">{serverError}</div>
          )}

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-3 text-center">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;