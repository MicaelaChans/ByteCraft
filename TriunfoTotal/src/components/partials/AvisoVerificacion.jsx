import { useState } from "react";
import api from "../../services/api";

// Aviso de "revisá tu email" con botón para reenviar el link de verificación.
// Se usa al terminar el registro y en el login si la cuenta no está verificada.
function AvisoVerificacion({ email, mensaje }) {
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    setEstado(null);
    try {
      const r = await api.post("auth/reenviar-verificacion", { email });
      setEstado({ tipo: "success", texto: r.mensaje });
    } catch (e) {
      setEstado({ tipo: "danger", texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="alert alert-info">
      <p className="mb-2">
        <i className="bi bi-envelope-check me-2"></i>
        {mensaje}
      </p>
      <p className="small mb-2">
        Si no lo ves en unos minutos, revisá la carpeta de <strong>spam</strong> o correo no deseado.
      </p>
      <button type="button" className="btn btn-sm btn-outline-primary" onClick={reenviar} disabled={enviando}>
        {enviando ? "Enviando..." : "Reenviar email"}
      </button>
      {estado && <div className={`small mt-2 text-${estado.tipo}`}>{estado.texto}</div>}
    </div>
  );
}

export default AvisoVerificacion;
