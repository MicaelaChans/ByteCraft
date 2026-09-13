import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import "../css/styles.css";

function CrearTorneo() {
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  // Si no hay usuario logueado, redirige al login (misma lógica que en Profile)
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const [torneoForm, setTorneoForm] = useState({
    nombre: "",
    id_disciplina: "",
    formato: "",
    fecha_inicio: "",
    fecha_fin: "",
    max_equipos: "",
    descripcion: "",
    // tipo: "Amateur", // <- descomentar si querés distinguir Amateur/Oficial
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Esta lista debería venir del backend (tabla `disciplinas`), la dejo hardcodeada por ahora
  const disciplinas = [
    { id: 1, nombre: "Fútbol" },
    { id: 2, nombre: "Ajedrez" },
    { id: 3, nombre: "Tenis de Mesa" },
    { id: 4, nombre: "Voleibol" },
    { id: 5, nombre: "eSports" },
  ];

  if (!user) return null;

  function handleChange(e) {
    const { name, value } = e.target;

    setTorneoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreateTorneo(e) {
  e.preventDefault();
  setError("");

  if (!torneoForm.nombre.trim()) {
    setError("El nombre del torneo es obligatorio.");
    return;
  }

  if (!torneoForm.id_disciplina || !torneoForm.formato) {
    setError("Elegí un deporte y un formato de competencia.");
    return;
  }

  if (
    torneoForm.fecha_inicio &&
    torneoForm.fecha_fin &&
    torneoForm.fecha_fin < torneoForm.fecha_inicio
  ) {
    setError("La fecha de finalización no puede ser anterior a la de inicio.");
    return;
  }

  if (!torneoForm.max_equipos || Number(torneoForm.max_equipos) < 2) {
    setError("La cantidad de equipos debe ser al menos 2.");
    return;
  }

  setSaving(true);

  try {
    await new Promise((resolve) => setTimeout(resolve, 500));

    navigate("/profile");
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="profile-page">
      <div className="container profile-container">
        <div className="profile-card">
          <div className="profile-banner"></div>

          <div className="px-4 py-5">
            <h2 className="profile-name text-center mb-5">Crear Torneo</h2>

            <div className="row justify-content-center">
              <div className="col-lg-8">
                <form onSubmit={handleCreateTorneo} className="profile-form">

                  {error && (
                    <div className="alert alert-danger">{error}</div>
                  )}

                  <div className="col-12 mb-3">
                    <label className="form-label">Nombre del torneo</label>
                    <input
                      type="text"
                      name="nombre"
                      className="form-control"
                      placeholder="Ej: Copa Verano 2026"
                      value={torneoForm.nombre}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Deporte</label>
                      <select
                        name="id_disciplina"
                        className="form-select"
                        value={torneoForm.id_disciplina}
                        onChange={handleChange}
                      >
                        <option value="">Seleccionar...</option>
                        {disciplinas.map((d) => (
                          <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Formato</label>
                      <select
                        name="formato"
                        className="form-select"
                        value={torneoForm.formato}
                        onChange={handleChange}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Liga">Liga (todos contra todos)</option>
                        <option value="Eliminacion">Eliminación directa</option>
                        <option value="Suizo">Sistema suizo</option>
                      </select>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Fecha de inicio</label>
                      <input
                        type="date"
                        name="fecha_inicio"
                        className="form-control"
                        value={torneoForm.fecha_inicio}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Fecha de finalización</label>
                      <input
                        type="date"
                        name="fecha_fin"
                        className="form-control"
                        value={torneoForm.fecha_fin}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Cantidad de equipos</label>
                      <input
                        type="number"
                        name="max_equipos"
                        min="2"
                        className="form-control"
                        placeholder="Ej: 16"
                        value={torneoForm.max_equipos}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="col-12 mb-4">
                      <label className="form-label">Descripción (opcional)</label>
                      <textarea
                        name="descripcion"
                        className="form-control"
                        rows="3"
                        placeholder="Reglas, notas u otra información del torneo"
                        value={torneoForm.descripcion}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate("/profile")}
                      disabled={saving}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn miColor"
                      disabled={saving}
                    >
                      {saving ? "Creando..." : "Crear torneo"}
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