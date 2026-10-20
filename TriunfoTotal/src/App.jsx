import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import NavBar from "./components/partials/Navbar";
import RutaProtegida from "./components/partials/RutaProtegida";
import { Cargando } from "./components/partials/Cargando";
import Home from "./components/Home";
import ContactUs from "./components/ContactUs";
import AboutUs from "./components/AboutUs";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Tournaments from "./components/Tournaments";
import Policies from "./components/Policies";
import TermsOfService from "./components/TermsOfService";
import TournamentDetail from "./components/TournamentDetail";
import Bytecraft from "./components/Bytecraft";
import CrearTorneo from "./components/CrearTorneo";
import GestionarTorneo from "./components/GestionarTorneo";
import MisEquipos from "./components/MisEquipos";
import AdminPanel from "./components/AdminPanel";
import NotFound from "./components/NotFound";
import VerificarEmail from "./components/VerificarEmail";
import api from "./services/api";
import { login, logout } from "./redux/userSlice";

function App() {
  const dispatch = useDispatch();
  const [sesionLista, setSesionLista] = useState(false);

  // Al abrir/recargar la página le preguntamos al backend si ya hay sesión
  // (la cookie es httpOnly: JavaScript no la puede leer, solo el servidor).
  useEffect(() => {
    api.get("auth/sesion")
      .then((usuario) => dispatch(usuario ? login(usuario) : logout()))
      .catch(() => dispatch(logout()))
      .finally(() => setSesionLista(true));
  }, [dispatch]);

  if (!sesionLista) {
    return <Cargando texto="Iniciando Triunfo Total..." />;
  }

  return (
    <>
      <NavBar />
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verificar-email" element={<VerificarEmail />} />
        <Route path="/aboutUs" element={<AboutUs />} />
        <Route path="/contactUs" element={<ContactUs />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/termsOfService" element={<TermsOfService />} />
        <Route path="/bytecraft" element={<Bytecraft />} />

        {/* Requieren sesión */}
        <Route path="/profile" element={<RutaProtegida><Profile /></RutaProtegida>} />
        <Route path="/crear_torneo" element={<RutaProtegida><CrearTorneo /></RutaProtegida>} />
        <Route path="/tournaments/:id/editar" element={<RutaProtegida><CrearTorneo /></RutaProtegida>} />
        <Route path="/tournaments/:id/gestionar" element={<RutaProtegida><GestionarTorneo /></RutaProtegida>} />
        <Route path="/equipos" element={<RutaProtegida><MisEquipos /></RutaProtegida>} />

        {/* Solo administradores */}
        <Route path="/admin" element={<RutaProtegida soloAdmin><AdminPanel /></RutaProtegida>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
