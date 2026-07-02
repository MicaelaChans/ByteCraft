import MyCarousel from "../components/partials/MyCarousel";
import Footer from "./partials/Footer";

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
      <Footer />
    </>
  );
}

export default Home;
