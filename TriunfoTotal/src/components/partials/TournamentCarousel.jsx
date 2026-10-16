import { useRef } from "react";
import { Link } from "react-router-dom";
import { claseEstado, textoEstado } from "../../utils/formato";

// Fila horizontal de tarjetas de torneos (recibe los torneos por props).
function TournamentCarousel({ torneos = [], vacio = "No hay torneos para mostrar todavía." }) {
  const rowRef = useRef(null);

  function scrollRow(direction) {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  if (torneos.length === 0) {
    return <p className="tournaments-empty">{vacio}</p>;
  }

  return (
    <section className="tournaments-row-section">
      <div className="tournaments-row-wrap">
        <button
          type="button"
          className="tournaments-row-arrow tournaments-row-arrow-left"
          onClick={() => scrollRow(-1)}
          aria-label="Anteriores"
        >
          ←
        </button>

        <div className="tournaments-row" ref={rowRef}>
          {torneos.map((t) => (
            <Link key={t.id_torneo} to={`/tournaments/${t.id_torneo}`} className="tournament-card">
              <img src={t.imagen} alt={t.disciplina} />
              <div className="tournament-card-body">
                <h6>{t.nombre}</h6>
                <span className="tournament-card-category">{t.disciplina}</span>
                <span className={`status-badge ${claseEstado(t)}`}>{textoEstado(t)}</span>
                {t.tipo === "Formal" && <span className="tournament-card-star" title="Torneo formal">★</span>}
              </div>
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="tournaments-row-arrow tournaments-row-arrow-right"
          onClick={() => scrollRow(1)}
          aria-label="Siguientes"
        >
          →
        </button>
      </div>
    </section>
  );
}

export default TournamentCarousel;
