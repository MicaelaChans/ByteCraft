import Footer from "./partials/Footer";
import "../css/styles.css";

function ContactUs() {
  return (
    <>
      <section id="sectionContact1">
        <div className="container">
          <div>
            <h2 className="fs-1">Contactanos...</h2>
            <p className="mt-4 fs-5">
              Dejanos tu comentario o compartí tu opinión para ayudarnos a seguir mejorando nuestra página web y brindarte una mejor experiencia.
            </p>
          </div>
        </div>
      </section>
      <section id="sectionContact2">
        <div className="container py-5">
          <h3>Esta sección fue creada especialmente para ti...</h3>
          <p className="mt-4">
            Tu opinión es importante para nosotros. Si tenés dudas, sugerencias o querés compartir tu experiencia usando nuestra plataforma de gestión de torneos, te invitamos a dejarnos un mensaje. Cada comentario nos ayuda a mejorar, optimizar nuestras herramientas y seguir construyendo un espacio pensado para jugadores, organizadores y amantes de la competencia. Completá el formulario y hacenos llegar tu aporte.
          </p>
          <div className="form-box mt-5 py-3 d-flex justify-content-center align-items-center">
            <form action="">
              <h2>Comparte tu experiencia:</h2>
              <div className="row">
                <div className="col-lg-6 col-md-6 col-sm-12">
                  <div className="inputbox">
                    <input type="text" name="firstname" placeholder="Claudio" required />
                    <label>Nombre</label>
                  </div>
                  <div className="inputbox">
                    <input type="text" name="Lastname" required />
                    <label>Apellido</label>
                  </div>
                  <div className="inputbox">
                    <input type="text" name="email" required />
                    <label>Email</label>
                  </div>
                  <div className="inputbox">
                    <input type="text" name="phone" required />
                    <label>Celular</label>
                  </div>
                </div>
                <div className="col-lg-6 col-md-6 col-sm-12">
                  <div className="inputbox">
                    <input type="text" name="subjet" required />
                    <label>Asunto</label>
                  </div>
                  <div className="d-flex flex-column">
                    <label>Comentario</label>
                    <textarea
                      className="border-2 border-black mt-3"
                      name="comentary"
                      id="comentary"
                      cols="40"
                      rows="4"
                    ></textarea>
                  </div>
                  <div className="form-check mt-3">
                    <input
                      className="form-check-input bg-black border-0"
                      type="checkbox"
                      name="flexCheckDefault"
                      id="flexCheckDefault"
                      value=""
                      required
                    />
                    <label
                      className="form-check-label"
                      htmlFor="flexCheckDefault"
                    >
                      Doy mi consentimiento a los términos de la política de privacidad.
                    </label>
                  </div>
                  <div className="d-flex justify-content-end aling-items-end mt-3">
                    <button className="btn btn-ligth">Enviar</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
export default ContactUs;
