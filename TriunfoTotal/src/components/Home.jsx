import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";
import "../css/styles.css";
import api from "../services/api";
import TournamentCarousel from "./partials/TournamentCarousel";

function Home() {
  const navigate = useNavigate();
  const [enCurso, setEnCurso] = useState([]);
  const [abiertos, setAbiertos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    api.get("torneos?estado_torneo=En Proceso&limite=15").then(setEnCurso).catch(() => {});
    api.get("torneos?estado_torneo=Borrador&limite=15").then(setAbiertos).catch(() => {});
  }, []);

  function buscar(e) {
    e.preventDefault();
    navigate(`/tournaments?q=${encodeURIComponent(busqueda)}`);
  }

  return (
    <>
      <MyCarousel />

      <div className="main-layout">
        <div className="content-area">
          <div className="container">
            <form className="search-bar" onSubmit={buscar} role="search">
              <input
                type="text"
                className="search-input"
                placeholder="Buscar torneos..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar torneos"
              />
              <button className="search-btn" type="submit" aria-label="Buscar"><i className="bi bi-search"></i>
              </button>
            </form>

            <section id="sectionHome">
              <div className="container">
                <h2 className="fs-1">Competir para crecer</h2>
                <div className="mt-5 fs-5">
                  <p>
                    La competencia sana es fundamental porque transforma la rivalidad en una oportunidad de crecimiento. 
                    Cuando las personas compiten con respeto y reglas claras, se generan aprendizajes valiosos: 
                    se desarrollan habilidades, se fomenta la disciplina y se impulsa la creatividad.
                  </p>
                  <p>
                    Además, la competencia sana fortalece los vínculos sociales, 
                    ya que promueve el reconocimiento del esfuerzo ajeno y la motivación personal sin caer en la envidia o el conflicto. 
                    En ámbitos como el deporte, el estudio o el trabajo, este tipo de competencia ayuda a mantener la pasión y el compromiso, 
                    recordándonos que lo importante no es solo ganar, sino mejorar y disfrutar del proceso.
                  </p>
                </div>
              </div>
            </section>
            <div className="tournament-carousel-home">
              <h4 className="mt-4">En curso ahora</h4>
              <TournamentCarousel torneos={enCurso} />
            </div>
            <div className="tournament-carousel-home pb-5">
              <h4 className="mt-4">Inscripciones abiertas</h4>
              <TournamentCarousel torneos={abiertos} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Home;