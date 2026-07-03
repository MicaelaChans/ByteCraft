import "../../css/navbar.css";

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          <img src="/img/logoB.png" alt="logo" />
        </a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavDropdown"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className="collapse navbar-collapse nav-content"
          id="navbarNavDropdown"
        >
          <ul className="navbar-nav mx-auto gap-4 nav-center">
            <li className="nav-item">
              <a className="nav-link" href="/ContactUs">
                Contacto
              </a>
            </li>

            <li className="nav-item">
              <a className="nav-link" href="/AboutUs">
                Nosotros
              </a>
            </li>
          </ul>
        </div>

        <div className="nav-right">
          <a href="/login" className="nav-login">
            <img src="/img/login2.png" alt="login2" />
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;