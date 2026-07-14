import { Link } from "react-router-dom";

function Footer() {
  return (
    // <footer className="bg-dark text-light pt-5 pb-3 mt-auto">//
    <footer className="site-footer pt-5 pb-3 mt-auto">
      <div className="container">
        <div className="row row-gap-4 text-center text-md-start">

          <div className="col-12 col-md-3">
            <h5 className="text-uppercase fw-bold">ByteCraft</h5>
            <p className="small text-secondary">
              Gestión deportiva inteligente y modular.
            </p>
          </div>

          <div className="col-12 col-md-3">
            <h5 className="text-uppercase small fw-bold">Navegación</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/" className="text-secondary text-decoration-none small">
                  Inicio
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/#" className="text-secondary text-decoration-none small">
                  Torneos
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/contactUs" className="text-secondary text-decoration-none small">
                  Contacto
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/aboutUs" className="text-secondary text-decoration-none small">
                  Nosotros
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-12 col-md-3">
            <h5 className="text-uppercase small fw-bold">
              Proyecto Académico
            </h5>
            <p className="small text-secondary mb-1">
              SGDM - 3º BT Tecnologías de la Información.
            </p>
            <p className="small text-secondary">ITS Arias Balparda</p>
          </div>

          <div className="col-12 col-md-3">
            <h5 className="text-uppercase small fw-bold">Soporte Legal</h5>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/policies" className="text-secondary text-decoration-none small">
                  Política de Privacidad
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  to="/terminos"
                  className="text-secondary text-decoration-none small"
                >
                  Términos de Servicio
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  to="/mapa"
                  className="text-secondary text-decoration-none small"
                >
                  Mapa del Sitio
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <hr className="bg-secondary my-4" />

        <div className="row">
          <div className="col-12 text-center">
            <p className="small text-secondary mb-0">
              © 2026 ByteCraft. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;