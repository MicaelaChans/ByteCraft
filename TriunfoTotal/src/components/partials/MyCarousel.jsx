import "../../css/MyCarousel.css";

function MyCarousel() {
  return (
    <div
      id="carouselExampleCaptions"
      className="carousel slide"
      data-bs-ride="carousel"
    >
      <div className="carousel-indicators">
        <button
          type="button"
          data-bs-target="#carouselExampleCaptions"
          data-bs-slide-to="0"
          className="active"
          aria-current="true"
          aria-label="Slide 1"
        ></button>

        <button
          type="button"
          data-bs-target="#carouselExampleCaptions"
          data-bs-slide-to="1"
          aria-label="Slide 2"
        ></button>

        <button
          type="button"
          data-bs-target="#carouselExampleCaptions"
          data-bs-slide-to="2"
          aria-label="Slide 3"
        ></button>

        <button
          type="button"
          data-bs-target="#carouselExampleCaptions"
          data-bs-slide-to="3"
          aria-label="Slide 4"
        ></button>
      </div>

      <div className="carousel-inner">
        <div className="carousel-item active">
          <img
            src="/img/voleibol.webp"
            className="d-block w-100 imgCarrusel"
            alt="Voleibol"
          />
          <div className="carousel-caption d-none d-md-block">
            <h5>Todos los juegos, una sola pasión.</h5>
          </div>
        </div>

        <div className="carousel-item">
          <img
            src="/img/ajedrez.webp"
            className="d-block w-100 imgCarrusel"
            alt="Ajedrez"
          />
          <div className="carousel-caption d-none d-md-block">
            <h5>Todos los juegos, una sola pasión.</h5>
          </div>
        </div>

        <div className="carousel-item">
          <img
            src="/img/Esport.png"
            className="d-block w-100 imgCarrusel"
            alt="Esports"
          />
          <div className="carousel-caption d-none d-md-block">
            <h5>Todos los juegos, una sola pasión.</h5>
          </div>
        </div>

        <div className="carousel-item">
          <img
            src="/img/futbol.jpg"
            className="d-block w-100 imgCarrusel"
            alt="Fútbol"
          />
          <div className="carousel-caption d-none d-md-block">
            <h5>Todos los juegos, una sola pasión.</h5>
          </div>
        </div>
      </div>

      <button
        className="carousel-control-prev"
        type="button"
        data-bs-target="#carouselExampleCaptions"
        data-bs-slide="prev"
      >
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Anterior</span>
      </button>

      <button
        className="carousel-control-next"
        type="button"
        data-bs-target="#carouselExampleCaptions"
        data-bs-slide="next"
      >
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Siguiente</span>
      </button>
    </div>
  );
}

export default MyCarousel;