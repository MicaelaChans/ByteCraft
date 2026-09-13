 import Footer from "./partials/Footer";
 
 function Bytecraft() {
    return (
    <>
    <section id="sectionBytecraft">
        <div className="container">
            <div>
            <h2 className="fs-1">Como surgió Bytecraft?</h2>
            <p className="mt-3 fs-5">La creación de ByteCraft surge como una forma de representar la identidad del equipo de proyecto, combinando aspectos relacionados con la tecnología, la creatividad y la capacidad de desarrollar soluciones digitales innovadoras. </p>
          </div>
        </div>
    </section>
    <section id="sectionBytecraft2" className="pb-4">
        <div className="container py-5">
          <h2 className="mt-3">Descubrí el propósito que impulsa nuestra plataforma y los valores que guían cada torneo.</h2>
          <h3 className="mt-5">Misión</h3>
          <p className="mt-4">Desarrollar soluciones tecnológicas innovadoras, funcionales y de calidad mediante la aplicación de conocimientos en programación, diseño y herramientas digitales, promoviendo el trabajo colaborativo, la creatividad y el aprendizaje continuo. Como equipo en formación, buscamos generar proyectos que respondan a necesidades reales del entorno digital, fortaleciendo nuestras capacidades técnicas, profesionales y humanas a través de la experiencia, el compromiso y la mejora constante.</p>
          <h3 className="mt-5">Visión</h3>
          <p className="mt-4">Consolidarnos como un equipo en constante crecimiento y aprendizaje, reconocido por nuestra capacidad de desarrollar proyectos tecnológicos creativos, funcionales e innovadores, fortaleciendo progresivamente nuestras habilidades técnicas y profesionales para adaptarnos a los cambios del entorno digital y proyectarnos hacia futuras oportunidades académicas, laborales y emprendedoras.</p>
          <h3 className="mt-5">Objetivos Generales</h3>
          <p className="mt-4">Desarrollar proyectos tecnológicos funcionales e innovadores que permitan aplicar conocimientos técnicos, fortalecer el aprendizaje práctico y promover el crecimiento profesional y colaborativo del equipo.</p>
          <h3 className="mt-5>">Objetivos Especificos</h3>
          <p className="mt-4>">Aplicar conocimientos de programación, diseño y herramientas digitales en proyectos tecnológicos. Fortalecer las habilidades técnicas y profesionales mediante la práctica y el aprendizaje continuo. Promover el trabajo colaborativo, la responsabilidad y la organización dentro del equipo. Diseñar soluciones tecnológicas adaptadas a necesidades actuales del entorno digital. Incentivar la creatividad, la innovación y la mejora continua en cada proyecto desarrollado.</p> 
          <h3 className="mt-5">Valores</h3>
          <ul className="mt-4">
            <li className="mt-2">Compromiso: Cumplir responsablemente con las tareas, metas y responsabilidades asumidas por el equipo.</li>
            <li className="mt-2">Trabajo en equipo: Promover la cooperación, el respeto y la participación activa para alcanzar objetivos comunes.</li>
            <li className="mt-2">Aprendisaje continuo: Mantener una actitud de formación permanente, incorporando nuevos conocimientos y habilidades tecnológicas.</li>
            <li className="mt-2">Creatividad e inovacion: Desarrollar ideas y soluciones originales orientadas a responder a necesidades reales.</li>
            <li className="mt-2">Responsabilidad: Actuar con organización, dedicación y ética en el desarrollo de cada proyecto.</li>
            <li className="mt-2">Respeto:   Valorar las ideas, opiniones y aportes de cada integrante, favoreciendo un ambiente colaborativo.</li>
          </ul>
        </div>
      </section>
      <section id="sectionBytecraft3" className="pb-4">
  <div className="container py-5">
    <h2 className="mt-3">Conocé a nuestro equipo...</h2>
    <p className="mt-4">
      Detrás de Triunfo Total hay un equipo comprometido con transformar
      ideas en soluciones digitales. Cada integrante de ByteForge aporta sus
      conocimientos, creatividad y experiencia para construir una plataforma
      pensada para facilitar la organización y gestión de competencias
      deportivas. Te invitamos a conocer a las personas que forman parte de
      este proyecto y que, trabajando en conjunto, hacen posible el desarrollo
      de Triunfo Total.
    </p>
  </div>

  <div className="container">
    <div className="row justify-content-center">
      
      <div className="col-12 col-sm-6 col-lg-3 text-center staff-card">
        <img
          className="imgStaff"
          src="/img/imgPablo.png"
          alt="Pablo Ávila"
        />
        <h3 className="mt-3">Pablo Ávila</h3>
        <p>Líder del proyecto / Emprendedor</p>
      </div>

      <div className="col-12 col-sm-6 col-lg-3 text-center staff-card">
        <img
          className="imgStaff"
          src="/img/imgFede.png"
          alt="Federico Canabarro"
        />
        <h3 className="mt-3">Federico Canabarro</h3>
        <p>Documentación / Ingeniería de Software</p>
      </div>

      <div className="col-12 col-sm-6 col-lg-3 text-center staff-card">
        <img
          className="imgStaff"
          src="/img/imgMica.png"
          alt="Micaela Chans"
        />
        <h3 className="mt-3">Micaela Chans</h3>
        <p>Desarrolladora Front-End</p>
      </div>

      <div className="col-12 col-sm-6 col-lg-3 text-center staff-card">
        <img
          className="imgStaff"
          src="/img/imgClaudio.png"
          alt="Claudio Fernandez"
        />
        <h3 className="mt-3">Claudio Fernandez</h3>
        <p>Sistemas Operativos / Infraestructura</p>
      </div>

    </div>
  </div>
</section>
      <Footer />
    </>
    )
 }

 export default Bytecraft;