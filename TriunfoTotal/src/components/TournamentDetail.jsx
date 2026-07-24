import { useParams, Link } from "react-router-dom";
import Footer from "./partials/Footer";
import "../css/styles.css";

// --- MOCK: por ahora todos los torneos muestran esta misma info (fútbol) ---
// Cuando esté el backend, esto se reemplaza por un fetch a
// GET /api/torneos/:id y este objeto se arma con lo que devuelva la API.
const mockDetail = {
  nombre: "Liga Fútbol 5",
  categoria: "Fútbol",
  formato: "Liga (todos contra todos)",
  estado: "En curso",
  img: "/img/futbol.jpg",
  organizador: "Club Atlético Central",
  inicio: "05/08/2026",
  fin: "20/09/2026",
  cupos: 16,
  inscriptos: 12,
  descripcion:
    "Torneo de fútbol 5 a la ciudad, formato liga todos contra todos a una rueda. Los mejores 4 equipos clasifican a semifinal.",
  fixture: [
    { ronda: "Fecha 1", partido: "Halcones vs Los Tácticos", fecha: "05/08", resultado: "3 - 1" },
    { ronda: "Fecha 2", partido: "Halcones vs Furia Roja", fecha: "12/08", resultado: "2 - 2" },
    { ronda: "Fecha 3", partido: "Los Tácticos vs Furia Roja", fecha: "19/08", resultado: "-" },
  ],
  posiciones: [
    { pos: 1, equipo: "Halcones", pj: 2, pts: 4 },
    { pos: 2, equipo: "Furia Roja", pj: 2, pts: 1 },
    { pos: 3, equipo: "Los Tácticos", pj: 2, pts: 1 },
  ],
  participantes: ["Halcones", "Furia Roja", "Los Tácticos", "Team Vórtice"],
};

function TournamentDetail() {
  const { id } = useParams();

  // TODO backend: reemplazar por el torneo real según `id`
  const torneo = mockDetail;

  return (
    <>
      <div className="tournament-detail-hero">
        <img src={torneo.img} alt={torneo.nombre} />
        <div className="tournament-detail-hero-overlay">
          <div className="container">
            <span className="status-badge status-live">{torneo.estado}</span>
            <h1>{torneo.nombre}</h1>
            <p className="mb-0">{torneo.categoria} · {torneo.formato}</p>
          </div>
        </div>
      </div>

      <div className="container tournament-detail-content">
        <div className="row">
          {/* Columna principal */}
          <div className="col-lg-8">
            <section className="my-tournaments-section">
              <h2 className="fs-4">Sobre el torneo</h2>
              <p>{torneo.descripcion}</p>
            </section>

            <section className="my-tournaments-section">
              <h2 className="fs-4">Fixture</h2>
              <div className="leaderboard">
                {torneo.fixture.map((f, i) => (
                  <div key={i} className="leaderboard-row">
                    <div className="leaderboard-info">
                      <span className="mt-card-meta">{f.ronda} · {f.fecha}</span>
                      <strong>{f.partido}</strong>
                    </div>
                    <span className="leaderboard-points">{f.resultado}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="my-tournaments-section">
              <h2 className="fs-4">Tabla de posiciones</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {torneo.posiciones.map((p) => (
                    <tr key={p.pos}>
                      <td>{p.pos}</td>
                      <td>{p.equipo}</td>
                      <td>{p.pj}</td>
                      <td>{p.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
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
                <span>{torneo.inicio}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Fin</span>
                <span>{torneo.fin}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Cupos</span>
                <span>{torneo.inscriptos} / {torneo.cupos}</span>
              </div>

              <button type="button" className="btn btn-primary w-100 mt-3">
                Inscribirme
              </button>

              <h6 className="mt-4">Participantes</h6>
              <ul className="tournament-detail-participants">
                {torneo.participantes.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Link to="/Tournaments" className="my-tournaments-link d-inline-block mt-3">
          ← Volver a Torneos
        </Link>
      </div>

      <Footer />
    </>
  );
}

export default TournamentDetail;