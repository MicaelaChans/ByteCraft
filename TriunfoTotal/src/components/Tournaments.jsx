import { useState, useRef, useMemo } from "react";
import MyCarousel from "../components/partials/MyCarousel";
import { Link } from "react-router-dom";
import Footer from "./partials/Footer";
import TournamentCarousel from "./partials/TournamentCarousel";
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
                placeholder="Buscar..."
              />
              <button className="search-btn"><i className="bi bi-search"></i>
              </button>
          </div>       
        </div>

        <section id="sectionTournaments1">
          <div className="container py-5">
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

        <div className="container tournament-carousel-home">
          <h4 className="mt-5">Torneos Individuales</h4>
          <TournamentCarousel />
        </div>
        <div className="container tournament-carousel-home mt-5">
          <h4 className="mt-5">Torneos por equipos</h4>
          <TournamentCarousel />
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Tournaments;