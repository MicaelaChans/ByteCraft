import { useState, useRef, useMemo } from "react";
import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";
import "../css/styles.css";

// mock de torneos - esto después va a venir del backend (PHP + MySQL)
const tournaments = [
  { id: 1, nombre: "Liga Fútbol 5", categoria: "Fútbol", img: "/img/futbol.jpg", destacado: true },
  { id: 2, nombre: "Copa Ajedrez Relámpago", categoria: "Ajedrez", img: "/img/ajedrez.webp", destacado: true },
  { id: 3, nombre: "Torneo Vóley Playa", categoria: "Vóley", img: "/img/voleibol.webp", destacado: true },
  { id: 4, nombre: "E-Sports Clásico", categoria: "E-sports", img: "/img/Esport.png", destacado: false },
  { id: 5, nombre: "Liga Fútbol 7", categoria: "Fútbol", img: "/img/futbol.jpg", destacado: false },
  { id: 6, nombre: "Suizo de Ajedrez", categoria: "Ajedrez", img: "/img/ajedrez.webp", destacado: false },
];

function Tournaments() {
  const [search, setSearch] = useState("");
  const rowRef = useRef(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tournaments;
    return tournaments.filter(
      (t) =>
        t.nombre.toLowerCase().includes(term) ||
        t.categoria.toLowerCase().includes(term)
    );
  }, [search]);

  function scrollRow(direction) {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: direction * 280, behavior: "smooth" });
  }

  return (
    <>
      <MyCarousel />

      <div className="tournaments-content">
        <div className="tournaments-toolbar">
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar torneo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          <button
            type="button"
            className="btn btn-warning tournaments-edit-btn"
            // TODO: habilitar solo si el usuario logueado organiza al menos un torneo
          >
            Editar mis torneos
          </button>
        </div>

        <section id="sectionTournaments1">
          <div className="container">
            <div>
              <h2 className="fs-1">Torneos</h2>
              <p className="mt-3 fs-5">
                "Todos los juegos, una sola pasión."
                <br />
                Este lema está elegido porque resume perfecto la idea de unir
                múltiples disciplinas en un solo lugar bajo un mismo objetivo:
                competir, disfrutar y compartir.
              </p>
            </div>
          </div>
        </section>

        <section className="tournaments-row-section">
          <div className="tournaments-row-wrap">
            <button
              type="button"
              className="tournaments-row-arrow tournaments-row-arrow-left"
              onClick={() => scrollRow(-1)}
              aria-label="Desplazar hacia la izquierda"
            >
              ←
            </button>

            <div className="tournaments-row" ref={rowRef}>
              {filtered.length === 0 && (
                <p className="tournaments-empty">
                  No se encontraron torneos para "{search}".
                </p>
              )}

              {filtered.map((t) => (
                <div key={t.id} className="tournament-card">
                  <img src={t.img} alt={t.nombre} />
                  <div className="tournament-card-body">
                    <h6>{t.nombre}</h6>
                    <span className="tournament-card-category">
                      {t.categoria}
                    </span>
                    {t.destacado && (
                      <span className="tournament-card-star">★</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="tournaments-row-arrow tournaments-row-arrow-right"
              onClick={() => scrollRow(1)}
              aria-label="Desplazar hacia la derecha"
            >
              →
            </button>
          </div>
        </section>

        </div>

      <Footer />
    </>
  );
}

export default Tournaments;