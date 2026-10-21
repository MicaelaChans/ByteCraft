import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import TorneoCard from "./partials/TorneoCard";
import { Cargando, MensajeError } from "./partials/Cargando";
import api from "../services/api";
import { fecha } from "../utils/formato";
import "../css/styles.css";

// Perfil PÚBLICO de un usuario (/usuarios/:id): datos no sensibles,
// estadísticas, torneos que organiza y botón para seguirlo.
function PerfilPublico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    setError("");
    api.get(`usuarios/${id}`).then(setDatos).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function alternarSeguir() {
    if (!user) {
      navigate("/login", { state: { desde: `/usuarios/${id}` } });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      const r = datos.yo_sigo ? await api.delete(`usuarios/${id}/seguir`) : await api.post(`usuarios/${id}/seguir`);
      setAviso({ tipo: "success", texto: r.mensaje });
      cargar();
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  if (error) return <div className="container py-5"><MensajeError error={error} onReintentar={cargar} /></div>;
  if (!datos) return <Cargando />;

  const { usuario: u, estadisticas: e, torneos } = datos;
  const tarjetas = [
    ["Seguidores", e.seguidores, "bi-people-fill"],
    ["Siguiendo", e.seguidos, "bi-person-check"],
    ["Torneos organizados", e.torneos_organizados, "bi-trophy"],
    ["Torneos finalizados", e.torneos_finalizados, "bi-flag"],
    ["Participaciones", e.participaciones, "bi-controller"],
  ];

  return (
    <div className="container py-4">
      <div className="tt-perfil-publico">
        {u.avatar ? (
          <img src={u.avatar} alt={`Foto de ${u.nombre}`} className="tt-perfil-avatar" />
        ) : (
          <i className="bi bi-person-circle tt-perfil-avatar-icono" aria-hidden="true"></i>
        )}
        <div className="flex-grow-1">
          <h1 className="fs-2 mb-0">{u.nombre} {u.apellido}</h1>
          {u.alias && <p className="text-body-secondary mb-1">@{u.alias}</p>}
          <p className="small text-body-secondary mb-0">En TriunfoTotal desde {fecha(u.creado_en)}</p>
        </div>
        {datos.es_yo ? (
          <Link to="/profile" className="btn btn-outline-secondary">Editar mi perfil</Link>
        ) : (
          <button className={`btn ${datos.yo_sigo ? "btn-outline-secondary" : "miColor"}`} onClick={alternarSeguir} disabled={enviando}>
            <i className={`bi ${datos.yo_sigo ? "bi-person-dash" : "bi-person-plus"} me-1`}></i>
            {datos.yo_sigo ? "Dejar de seguir" : "Seguir"}
          </button>
        )}
      </div>

      {aviso && <div className={`alert alert-${aviso.tipo} mt-3`}>{aviso.texto}</div>}
      {!datos.es_yo && !datos.yo_sigo && (
        <p className="small text-body-secondary mt-2">
          Seguilo para enterarte cuando publique un torneo nuevo.
        </p>
      )}

      <div className="tt-stats tt-stats-5 my-4">
        {tarjetas.map(([t, v, icono]) => (
          <div key={t} className="tt-stat">
            <i className={`bi ${icono}`}></i>
            <strong>{v}</strong>
            <span>{t}</span>
          </div>
        ))}
      </div>

      <h2 className="fs-4">Torneos que organiza</h2>
      {torneos.length === 0 ? (
        <p className="tournaments-empty">Todavía no organizó torneos públicos.</p>
      ) : (
        <div className="tt-grid">
          {torneos.map((t) => <TorneoCard key={t.id_torneo} torneo={t} />)}
        </div>
      )}
    </div>
  );
}

export default PerfilPublico;
