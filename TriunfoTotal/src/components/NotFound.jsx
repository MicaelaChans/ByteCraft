import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 className="display-4">404</h1>
      <p className="fs-5">La página que buscás no existe.</p>
      <Link to="/" className="btn miColor">Volver al inicio</Link>
    </div>
  );
}

export default NotFound;
