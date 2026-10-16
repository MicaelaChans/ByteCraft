import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

// Envuelve páginas que requieren estar logueado (o ser admin).
// OJO: esto es solo comodidad visual. La seguridad REAL está en el backend,
// que vuelve a controlar la sesión y el rol en cada petición.
function RutaProtegida({ children, soloAdmin = false }) {
  const user = useSelector((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  if (soloAdmin && !user.roles?.includes("Administrador")) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default RutaProtegida;
