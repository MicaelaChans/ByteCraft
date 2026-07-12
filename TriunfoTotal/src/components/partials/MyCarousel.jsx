import { useState } from "react";
import "../../css/styles.css";

const slides = [
  {
    src: "/img/voleibol.webp",
    alt: "voleibol",
    caption: "Todos los juegos, una sola pasión.",
  },
  {
    src: "/img/ajedrez.webp",
    alt: "ajedrez",
    caption: "Todos los juegos, una sola pasión.",
  },
  {
    src: "/img/futbol.jpg",
    alt: "futbol",
    caption: "Todos los juegos, una sola pasión.",
  },
  {
    src: "/img/Esport.png",
    alt: "e-sports",
    caption: "Todos los juegos, una sola pasión.",
  },
];

const SLIDE_WIDTH = 70;
const GAP = 6;
const STEP = SLIDE_WIDTH + GAP;

function MyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  function goTo(index) {
    const total = slides.length;
    setActiveIndex(((index % total) + total) % total);
  }

  const offset = 50 - activeIndex * STEP - SLIDE_WIDTH / 2;

  return (
    <div className="my-carousel">
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{ transform: `translateX(${offset}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.alt}
              className={`carousel-slide ${
                index === activeIndex ? "active" : ""
              }`}
              style={{
                width: `${SLIDE_WIDTH}%`,
                marginRight: `${GAP}%`,
              }}
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
        </div>
      </div>

      <button
        className="carousel-control-prev"
        onClick={() => goTo(activeIndex - 1)}
        aria-label="Anterior"
      >
        <span className="carousel-control-prev-icon"></span>
      </button>

      <button
        className="carousel-control-next"
        onClick={() => goTo(activeIndex + 1)}
        aria-label="Siguiente"
      >
        <span className="carousel-control-next-icon"></span>
      </button>

      <div className="carousel-indicators">
        {slides.map((slide, index) => (
          <button
            key={slide.alt}
            type="button"
            className={index === activeIndex ? "active" : ""}
            aria-label={`Ir a ${slide.alt}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default MyCarousel;