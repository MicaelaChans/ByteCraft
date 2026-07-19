import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/userSlice";
import ThemeToggle from "./ThemeToggle";
import "../../css/styles.css";

function Navbar() {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);       // dropdown de perfil
  const [mobileOpen, setMobileOpen] = useState(false);   // menú hamburguesa mobile
  const menuRef = useRef(null);

  // cierra el dropdown de perfil si el usuario clickea afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // cierra el menú mobile al cambiar de ruta/logout
  function closeAll() {
    setMenuOpen(false);
    setMobileOpen(false);
  }

  function handleLogout() {
    dispatch(logout());
    closeAll();
    navigate("/");
  }

  return (
    <nav className="tt-navbar">
      <div className="tt-navbar-inner">
        <Link className="tt-navbar-brand" to="/" onClick={closeAll}>
          <img src="/img/logoB.png" alt="logo" />
        </Link>

        <button
          className={`tt-navbar-toggler ${mobileOpen ? "is-open" : ""}`}
          type="button"
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`tt-navbar-collapse ${mobileOpen ? "is-open" : ""}`}>
          <ul className="tt-nav-center">
            <li className="tt-nav-item">
              <Link className="tt-nav-link" to="/Tournaments" onClick={closeAll}>
                Torneos
              </Link>
            </li>
            <li className="tt-nav-item">
              <Link className="tt-nav-link" to="/contactUs" onClick={closeAll}>
                Contacto
              </Link>
            </li>
            <li className="tt-nav-item">
              <Link className="tt-nav-link" to="/aboutUs" onClick={closeAll}>
                Nosotros
              </Link>
            </li>
          </ul>

          <div className="tt-nav-right" ref={menuRef}>
            <ThemeToggle />
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
                      onClick={closeAll}
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
              <Link to="/login" className="nav-login" onClick={closeAll}>
                <img src="/img/login2.png" alt="login2" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;