import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "../../redux/userSlice";

// Botón de "Continuar con Google".
// HOY: simula el login (igual que el resto del formulario), para no
// frenar el desarrollo del resto de la app.
// FUTURO: cuando tengan el Client ID de Google, acá adentro se reemplaza
// el mock por la llamada real a Google Identity Services (ver comentario
// al final del archivo con los pasos).
function GoogleButton({ label = "Continuar con Google" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleGoogleClick() {
    dispatch(
      login({
        nombre: "Usuario Google",
        email: "usuario.demo@gmail.com",
        avatar: "/img/login2.png",
      })
    );
    navigate("/profile");
  }

  return (
    <button
      type="button"
      className="google-btn"
      onClick={handleGoogleClick}
    >
      <svg className="google-btn-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5c-7.7 0-14.4 4.4-17.7 10.2z"/>
        <path fill="#4CAF50" d="M24 43.5c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4c-2 1.5-4.6 2.5-7.6 2.5-5.3 0-9.7-3.1-11.4-7.6l-6.6 5.1C9.5 39 16.2 43.5 24 43.5z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2.1 3.9-3.9 5.2l6.6 5.4C41.7 35.9 43.5 30.4 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      <span>{label}</span>
    </button>
  );
}

export default GoogleButton;

/*
  PASOS PARA CUANDO CONECTEMOS LA API REAL DE GOOGLE: 
  1. Agregar el script de Google en index.html:
     <script src="https://accounts.google.com/gsi/client" async defer></script>
  2. Reemplazar handleGoogleClick por algo como:
     window.google.accounts.id.initialize({
       client_id: "TU_CLIENT_ID.apps.googleusercontent.com",
       callback: (response) => {
         // response.credential es un JWT firmado por Google
         // hay que mandarlo al backend (PHP) para que lo valide
         // contra la API de Google y devuelva los datos del usuario
       },
     });
     window.google.accounts.id.prompt();
  3. En PHP, verificar el token con la librería oficial de Google
     (google/apiclient) antes de crear la sesión del usuario.
*/