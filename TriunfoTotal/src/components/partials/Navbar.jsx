import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/userSlice";
import "../../css/styles.css";

function Navbar() {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // cierra el menú si el usuario clickea afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    dispatch(logout());
    setMenuOpen(false);
    navigate("/");
  }

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <img src="/img/logoB.png" alt="logo" />
        </Link>

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
              <Link className="nav-link" to="/contactUs">
                Contacto
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/aboutUs">
                Nosotros
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/tournaments">
                Torneos
              </Link>
            </li>
          </ul>
        </div>

        <div className="nav-right" ref={menuRef}>
          {user ? (
            <div className="profile-menu">
              <button
                className="profile-trigger"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <img src={user.avatar || "/img/login2.png"} alt="perfil" />
              </button>

              {menuOpen && (
                <div className="profile-dropdown">
                  <p className="profile-dropdown-email">{user.email}</p>
                  <Link
                    to="/profile"
                    className="profile-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>
                  <button
                    className="profile-dropdown-item profile-dropdown-logout"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-login">
              <img src="/img/login2.png" alt="login2" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;