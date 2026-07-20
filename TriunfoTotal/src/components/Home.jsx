import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";
import "../css/styles.css";
import Sidebar from "./partials/Sidebar";
import TournamentCarousel from "./partials/TournamentCarousel";

function Home() {
  return (
    <>
      <MyCarousel />

      <div className="main-layout">
        {/*<Sidebar />*/}

        <div className="content-area">
          <div className="container">
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="Buscar..."
              />
              <button className="search-btn"><i className="bi bi-search"></i>
              </button>
            </div>

            <section id="sectionHome">
              <div className="container">
                <h2 className="fs-1">Competir para crecer</h2>
                <div className="mt-4 fs-5">
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
            <TournamentCarousel />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Home;