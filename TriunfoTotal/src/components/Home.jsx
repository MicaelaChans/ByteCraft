import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";
import "../css/home.css";

function Home() {

  return (
    <>
      <MyCarousel/>
      <section id="sectionHome">
        <div className="container py-5">
          <div>
            <h2 className="fs-1">Lorem</h2>
          </div>
          <div className="mt-4 fs-5">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Corrupti
              quibusdam neque id fugiat dolor libero, tenetur non asperiores
              voluptatem quo pariatur atque vero facilis, cupiditate recusandae
              numquam at suscipit. Nisi!
            </p>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Laudantium nisi rem reprehenderit aspernatur repellat explicabo
              numquam deleniti similique cupiditate ad in, consectetur
              consequuntur optio odit sunt aperiam. Excepturi, at enim!
            </p>
          </div>
        </div>
      </section>
      <section className="cards-container py-5">
              <div className="card">Futbol 5</div>
              <div className="card">Basquetbol</div>
              <div className="card">Ajedrez</div>
              <div className="card">Valorant</div>
              <div className="card">jsdbvkj</div>
              <div className="card">snovsjnv</div>
              <div className="card">sofdikg</div>
              <div className="card">fovkwp</div>
            </section>
      <Footer />
    </>
  );
}

export default Home;
