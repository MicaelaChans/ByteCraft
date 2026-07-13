import { useState, useEffect, useRef } from "react";
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

const extendedSlides = [slides[slides.length - 1], ...slides, slides[0]];

const SLIDE_WIDTH = 70;
const GAP = 6;
const STEP = SLIDE_WIDTH + GAP;
const TRANSITION_MS = 500;

function MyCarousel() {
  // arranca en 1: la posición 0 es el clon, la real está corrida un lugar
  const [activeIndex, setActiveIndex] = useState(1);
  const [withTransition, setWithTransition] = useState(true);
  const isJumping = useRef(false);

  function move(step) {
    if (isJumping.current) return; // evita clicks locos mientras se reubica en silencio
    setWithTransition(true);
    setActiveIndex((prev) => prev + step);
  }

  function goToReal(realIndex) {
    if (isJumping.current) return;
    setWithTransition(true);
    setActiveIndex(realIndex + 1); // +1 porque el clon ocupa la posición 0
  }

  useEffect(() => {
    const isCloneOfLast = activeIndex === 0;
    const isCloneOfFirst = activeIndex === extendedSlides.length - 1;

    if (!isCloneOfLast && !isCloneOfFirst) return;

    isJumping.current = true;
    const timer = setTimeout(() => {
      setWithTransition(false);
      setActiveIndex(isCloneOfLast ? slides.length : 1);
    }, TRANSITION_MS);

    return () => clearTimeout(timer);
  }, [activeIndex]);

  useEffect(() => {
    if (withTransition) return;
    const raf = requestAnimationFrame(() => {
      setWithTransition(true);
      isJumping.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [withTransition]);

  const offset = 50 - activeIndex * STEP - SLIDE_WIDTH / 2;

  const realActiveIndex =
    activeIndex === 0
      ? slides.length - 1
      : activeIndex === extendedSlides.length - 1
      ? 0
      : activeIndex - 1;

  return (
    <div className="my-carousel">
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(${offset}%)`,
            transition: withTransition ? `transform ${TRANSITION_MS}ms ease` : "none",
          }}
        >
          {extendedSlides.map((slide, index) => (
            <div
              key={`${slide.alt}-${index}`}
              className={`carousel-slide ${index === activeIndex ? "active" : ""}`}
              style={{
                width: `${SLIDE_WIDTH}%`,
                marginRight: `${GAP}%`,
              }}
              onClick={() => move(index - activeIndex)}
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
        onClick={() => move(-1)}
        aria-label="Anterior"
      >
        <span className="carousel-control-prev-icon"></span>
      </button>

      <button
        className="carousel-control-next"
        onClick={() => move(1)}
        aria-label="Siguiente"
      >
        <span className="carousel-control-next-icon"></span>
      </button>

      <div className="carousel-indicators">
        {slides.map((slide, index) => (
          <button
            key={slide.alt}
            type="button"
            className={index === realActiveIndex ? "active" : ""}
            aria-label={`Ir a ${slide.alt}`}
            onClick={() => goToReal(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default MyCarousel;