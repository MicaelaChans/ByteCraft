import Footer from "./partials/Footer";
import "../css/AboutUs.css";

function AboutUs() {
  return (
    <>
      <section id="sectionAbout1">
        <div className="container">
          <div>
            <h2 className="fs-1">Sobre Nosotros</h2>
            <p className="mt-3 fs-5">“Todos los juegos, una sola pasión.” <br />Este lema está elegido porque resume perfecto la idea de unir múltiples disciplinas en un solo lugar bajo un mismo objetivo: competir, disfrutar y compartir.</p>
          </div>
        </div>
      </section>
      <section id="sectionAbout2" className="pb-4">
        <div className="container py-5">
          <h2 className="mt-3">Descubrí el propósito que impulsa nuestra plataforma y los valores que guían cada torneo.</h2>
          <h3 className="mt-5">Misión</h3>
          <p className="mt-4"> Brindar una plataforma accesible, intuitiva y organizada que facilite la creación, gestión y participación en torneos de todo tipo, conectando personas y comunidades a través de la competencia sana, el entretenimiento y el juego limpio.</p>
          <p>Nuestro objetivo es convertir la organización de torneos en una experiencia simple, dinámica y eficiente para jugadores amateurs, profesionales y grupos de amigos.</p>
          <h3 className="mt-5">Visión</h3>
          <p className="mt-4">Aspiramos a convertirnos en la plataforma de referencia para torneos en Uruguay y la región, promoviendo espacios competitivos inclusivos, modernos y confiables que conecte a jugadores de distintas disciplinas y que impulse el crecimiento del deporte y el gaming local.</p>
          <h3 className="mt-5">Objetivos</h3>
          <p className="mt-4">Facilitar la organización y participación en torneos de forma clara y accesible. Promover la competencia sana y el respeto entre los participantes. Integrar deportes, videojuegos y juegos de mesa en un mismo espacio. Brindar una experiencia moderna que funcione en cualquier dispositivo. Construir una comunidad activa que celebre logros y fomente la superación personal.</p>
          <h3 className="mt-5">Valores</h3>
          <p>
            <ul className="mt-4">
              <li className="mt-2">Transparencia: reglas claras y procesos justos en cada torneo. </li>
              <li className="mt-2">Respeto: valorar a cada jugador y fomentar el compañerismo. </li>
              <li className="mt-2">Diversión: que competir sea siempre una experiencia positiva.</li>
              <li className="mt-2">Innovación: mejorar constantemente la plataforma para ofrecer lo mejor.</li>
              <li className="mt-2">Inclusión: abrir las puertas a todos, sin importar nivel o disciplina.</li>
              <li className="mt-2">Juego limpio:Promovemos la honestidad, el respeto por las reglas y la igualdad de oportunidades para todos los participantes.</li>
            </ul>
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
export default AboutUs;
