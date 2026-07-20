import { useRef } from "react";

const tournaments = [
  { id: 1, nombre: "Liga Fútbol 5", categoria: "Fútbol", img: "/img/futbol.jpg", destacado: true },
  { id: 2, nombre: "Copa Ajedrez Relámpago", categoria: "Ajedrez", img: "/img/ajedrez.webp", destacado: true },
  { id: 3, nombre: "Torneo Vóley Playa", categoria: "Vóley", img: "/img/voleibol.webp", destacado: true },
  { id: 4, nombre: "E-Sports Clásico", categoria: "E-sports", img: "/img/Esport.png", destacado: false },
  { id: 5, nombre: "Liga Fútbol 7", categoria: "Fútbol", img: "/img/futbol.jpg", destacado: false },
  { id: 6, nombre: "Suizo de Ajedrez", categoria: "Ajedrez", img: "/img/ajedrez.webp", destacado: false },
];

function TournamentCarousel() {
  const rowRef = useRef(null);

  function scrollRow(direction) {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  return (
    <section className="tournaments-row-section">
      <div className="tournaments-row-wrap">
        <button
          type="button"
          className="tournaments-row-arrow tournaments-row-arrow-left"
          onClick={() => scrollRow(-1)}
        >
          ←
        </button>

        <div className="tournaments-row" ref={rowRef}>
          {tournaments.map((t) => (
            <div key={t.id} className="tournament-card">
              <img src={t.img} alt={t.nombre} />
              <div className="tournament-card-body">
                <h6>{t.nombre}</h6>
                <span className="tournament-card-category">{t.categoria}</span>
                {t.destacado && <span className="tournament-card-star">★</span>}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="tournaments-row-arrow tournaments-row-arrow-right"
          onClick={() => scrollRow(1)}
        >
          →
        </button>
      </div>
    </section>
  );
}

export default TournamentCarousel;