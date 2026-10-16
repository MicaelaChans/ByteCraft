// Indicador de carga y mensaje de error reutilizables

export function Cargando({ texto = "Cargando..." }) {
  return (
    <div className="tt-cargando" role="status">
      <div className="spinner-border" aria-hidden="true"></div>
      <span>{texto}</span>
    </div>
  );
}

export function MensajeError({ error, onReintentar }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center gap-2" role="alert">
      <span>{error}</span>
      {onReintentar && (
        <button className="btn btn-sm btn-outline-danger" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export default Cargando;
