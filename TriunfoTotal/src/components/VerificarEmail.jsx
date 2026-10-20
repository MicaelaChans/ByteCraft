import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../redux/userSlice";
import { Cargando } from "./partials/Cargando";
import api from "../services/api";
import "../css/styles.css";

// Página a la que lleva el link del email: /verificar-email?token=...
// Le manda el token al backend; si es válido, activa la cuenta e inicia sesión.
function VerificarEmail() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [estado, setEstado] = useState("verificando"); // verificando | ok | error
  const [error, setError] = useState("");
  const yaPedido = useRef(false); // evita mandar el token dos veces (React StrictMode)

  useEffect(() => {
    if (yaPedido.current) return;
    yaPedido.current = true;

    const token = params.get("token") || "";
    api.post("auth/verificar", { token })
      .then((usuario) => {
        dispatch(login(usuario));
        setEstado("ok");
      })
      .catch((e) => {
        setError(e.message);
        setEstado("error");
      });
  }, [params, dispatch]);

  return (
    <div className="login-page">
      <div className="login-card text-center">
        {estado === "verificando" && <Cargando texto="Verificando tu email..." />}

        {estado === "ok" && (
          <>
            <i className="bi bi-patch-check-fill text-success" style={{ fontSize: "3rem" }}></i>
            <h1 className="fs-3 mt-2">¡Email confirmado!</h1>
            <p>Tu cuenta ya está activa y la sesión quedó iniciada.</p>
            <button className="btn btn-primary w-100" onClick={() => navigate("/profile")}>
              Ir a mi perfil
            </button>
          </>
        )}

        {estado === "error" && (
          <>
            <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: "3rem" }}></i>
            <h1 className="fs-3 mt-2">No pudimos verificar</h1>
            <p>{error}</p>
            <Link to="/login" className="btn btn-primary w-100">Ir a iniciar sesión</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerificarEmail;
