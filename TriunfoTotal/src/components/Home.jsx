import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";
import "../css/home.css";
import Sidebar from "./partials/Sidebar";

function Home() {
  return (
    <>
      <MyCarousel />

      <div className="main-layout container">
        <Sidebar />

        <div className="content-area">
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar..."
            />
            <button className="search-btn">🔍</button>
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

          <section className="cards-container">
            <div className="card">Futbol 5</div>
            <div className="card">Basquetbol</div>
            <div className="card">Ajedrez</div>
            <div className="card">Valorant</div>
            <div className="card">Futbol 11</div>
            <div className="card">Ping pong</div>
            <div className="card">Voleyball</div>
            <div className="card">Truco</div>
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default Home;
