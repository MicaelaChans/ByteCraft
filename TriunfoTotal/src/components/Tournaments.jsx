import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";
import TournamentCarousel from "./partials/TournamentCarousel";
import TorneoCard from "./partials/TorneoCard";
import { Cargando, MensajeError } from "./partials/Cargando";
import api, { qs } from "../services/api";
import { FORMATOS } from "../utils/formato";
import "../css/styles.css";

// Módulo de CONSULTA PÚBLICA: cualquiera (sin login) puede buscar torneos.
function Tournaments() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  const [torneos, setTorneos] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [params] = useSearchParams(); // permite llegar desde el buscador del Home (?q=...)
  const [filtros, setFiltros] = useState({ q: params.get("q") || "", id_disciplina: "", formato: "", estado_torneo: "" });
  const [busqueda, setBusqueda] = useState(filtros);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const hayFiltros = Object.values(busqueda).some((v) => v !== "");

  const cargar = useCallback(() => {
    setCargando(true);
    setError("");
    api.get(`torneos${qs(busqueda)}`)
      .then(setTorneos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [busqueda]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { api.get("disciplinas").then(setDisciplinas).catch(() => {}); }, []);

  function cambiarFiltro(e) {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
    // los selects filtran al instante; el texto espera a "Buscar"
    if (name !== "q") setBusqueda((prev) => ({ ...prev, [name]: value }));
  }

  function buscar(e) {
    e.preventDefault();
    setBusqueda(filtros);
  }

  // "Participar" muestra los torneos que todavía aceptan inscripciones
  function verInscripcionesAbiertas() {
    setFiltros((f) => ({ ...f, estado_torneo: "Borrador" }));
    setBusqueda((b) => ({ ...b, estado_torneo: "Borrador" }));
  }

  function limpiar() {
    const vacio = { q: "", id_disciplina: "", formato: "", estado_torneo: "" };
    setFiltros(vacio);
    setBusqueda(vacio);
  }

  const individuales = torneos.filter((t) => t.modalidad === "Individual");
  const porEquipos = torneos.filter((t) => t.modalidad === "Equipos");

  return (
    <>
      <MyCarousel />

      <div className="tournaments-content">
        <div className="tournaments-toolbar">
          <button className="btn btn-outline-light" onClick={() => navigate(user ? "/crear_torneo" : "/login")}>
            Crear torneo
          </button>
          <button
            className="btn btn-outline-light"
            onClick={verInscripcionesAbiertas}
          >
            Participar
          </button>

          <form className="search-bar mt-3" onSubmit={buscar} role="search">
            <input
              type="text"
              name="q"
              className="search-input"
              placeholder="Buscar torneo, disciplina u organizador..."
              value={filtros.q}
              onChange={cambiarFiltro}
              aria-label="Buscar torneos"
            />
            <button className="search-btn" type="submit" aria-label="Buscar">
              <i className="bi bi-search"></i>
            </button>
          </form>
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

            <div className="tt-filtros mt-4">
              <select name="id_disciplina" className="form-select" value={filtros.id_disciplina} onChange={cambiarFiltro} aria-label="Disciplina">
                <option value="">Todas las disciplinas</option>
                {disciplinas.map((d) => (
                  <option key={d.id_disciplina} value={d.id_disciplina}>{d.nombre}</option>
                ))}
              </select>
              <select name="formato" className="form-select" value={filtros.formato} onChange={cambiarFiltro} aria-label="Formato">
                <option value="">Todos los formatos</option>
                {Object.entries(FORMATOS).map(([valor, texto]) => (
                  <option key={valor} value={valor}>{texto}</option>
                ))}
              </select>
              <select name="estado_torneo" className="form-select" value={filtros.estado_torneo} onChange={cambiarFiltro} aria-label="Estado">
                <option value="">Todos los estados</option>
                <option value="Borrador">Inscripciones abiertas</option>
                <option value="En Proceso">En curso</option>
                <option value="Finalizado">Finalizados</option>
              </select>
              {hayFiltros && (
                <button type="button" className="btn btn-outline-secondary" onClick={limpiar}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="container">
          <MensajeError error={error} onReintentar={cargar} />
        </div>

        {cargando ? (
          <Cargando texto="Buscando torneos..." />
        ) : hayFiltros ? (
          <div className="container pb-5">
            <h4>{torneos.length} resultado(s)</h4>
            {torneos.length === 0 ? (
              <p className="tournaments-empty">No encontramos torneos con esos filtros.</p>
            ) : (
              <div className="tt-grid">
                {torneos.map((t) => <TorneoCard key={t.id_torneo} torneo={t} />)}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="container tournament-carousel-home">
              <h4 className="mt-5">Torneos Individuales</h4>
              <TournamentCarousel torneos={individuales} />
            </div>
            <div className="container tournament-carousel-home mt-5 pb-5">
              <h4 className="mt-5">Torneos por equipos</h4>
              <TournamentCarousel torneos={porEquipos} />
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

export default Tournaments;
