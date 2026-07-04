<<<<<<< HEAD
import "../../css/MyCarousel.css";
=======
import { useState } from "react";
import "../../css/myCarousel.css";

const slides = [
  { src: "/img/voleibol.webp", alt: "voleibol", caption: "Todos los juegos, una sola pasión." },
  { src: "/img/ajedrez.webp", alt: "ajedrez", caption: "Todos los juegos, una sola pasión." },
  { src: "/img/futbol.jpg", alt: "futbol", caption: "Todos los juegos, una sola pasión." },
  { src: "/img/Esport.png", alt: "e-sports", caption: "Todos los juegos, una sola pasión." },
];

const SLIDE_WIDTH = 70;
const GAP = 6;
const STEP = SLIDE_WIDTH + GAP;
>>>>>>> 0eb06b9cacff8e282fa0946a4c6d3aca0b15d7ca

function MyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  function goTo(index) {
    // wrap-around: si te pasás del final volvés al principio, y viceversa
    const total = slides.length;
    setActiveIndex(((index % total) + total) % total);
  }

  const offset = 50 - activeIndex * STEP - SLIDE_WIDTH / 2;

  return (
<<<<<<< HEAD
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
=======
    <div className="my-carousel">
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{ transform: `translateX(${offset}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.alt}
              className={`carousel-slide ${index === activeIndex ? "active" : ""}`}
              style={{ width: `${SLIDE_WIDTH}%`, marginRight: `${GAP}%` }}
              onClick={() => goTo(index)}
            >
              <img src={slide.src} alt={slide.alt} />
              {index === activeIndex && (
                <div className="carousel-caption">
                  <h5>{slide.caption}</h5>
                </div>
              )}
            </div>
          ))}
>>>>>>> 0eb06b9cacff8e282fa0946a4c6d3aca0b15d7ca
        </div>
      </div>

      <button
        type="button"
        className="carousel-control-prev"
        onClick={() => goTo(activeIndex - 1)}
        aria-label="Anterior"
      >
        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Anterior</span>
      </button>

      <button
        type="button"
        className="carousel-control-next"
        onClick={() => goTo(activeIndex + 1)}
        aria-label="Siguiente"
      >
        <span className="carousel-control-next-icon" aria-hidden="true"></span>
        <span className="visually-hidden">Siguiente</span>
      </button>

      <div className="carousel-indicators">
        {slides.map((slide, index) => (
          <button
            key={slide.alt}
            type="button"
            className={index === activeIndex ? "active" : ""}
            aria-label={`Ir a ${slide.alt}`}
            onClick={() => goTo(index)}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default MyCarousel;