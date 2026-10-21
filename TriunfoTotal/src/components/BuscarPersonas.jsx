import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "../css/styles.css";

// Buscador de personas (organizadores, jugadores) para ver su perfil y seguirlos.
function BuscarPersonas() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState("");

  async function buscar(e) {
    e.preventDefault();
    setError("");
    if (q.trim().length < 2) {
      setError("Escribí al menos 2 letras.");
      return;
    }
    try {
      setResultados(await api.get(`usuarios?q=${encodeURIComponent(q.trim())}`));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container py-4">
      <h1 className="fs-2">Personas</h1>
      <p className="text-body-secondary">
        Buscá organizadores y jugadores. Si seguís a alguien, te avisamos cuando publique un torneo.
      </p>

      <form className="d-flex gap-2 mb-4" onSubmit={buscar} role="search">
        <input className="form-control" placeholder="Nombre, apellido o alias" value={q}
               onChange={(e) => setQ(e.target.value)} aria-label="Buscar personas" />
        <button className="btn miColor" type="submit"><i className="bi bi-search"></i></button>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}
      {resultados && resultados.length === 0 && <p className="tournaments-empty">No encontramos a nadie con ese nombre.</p>}

      <div className="tt-grid">
        {resultados?.map((p) => (
          <Link key={p.id_usuario} to={`/usuarios/${p.id_usuario}`} className="tt-persona">
            {p.avatar ? <img src={p.avatar} alt="" /> : <i className="bi bi-person-circle" aria-hidden="true"></i>}
            <span>
              <strong>{p.nombre} {p.apellido}</strong>
              {p.alias && <small className="d-block text-body-secondary">@{p.alias}</small>}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default BuscarPersonas;
