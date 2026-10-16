// Llave (bracket) de eliminación directa: una columna por ronda.

function Marcador({ p }) {
  if (p.id_equipo_visita === null) {
    return (
      <div className="tt-llave-partido">
        <div className="tt-llave-equipo ganador">
          <span>{p.equipo_local}</span><span className="text-body-secondary small">pasa directo</span>
        </div>
      </div>
    );
  }
  const fin = p.estado === "Finalizado";
  const ganaLocal = fin && p.goles_local > p.goles_visita;
  const ganaVisita = fin && p.goles_visita > p.goles_local;
  return (
    <div className="tt-llave-partido">
      <div className={`tt-llave-equipo ${ganaLocal ? "ganador" : ""}`}>
        <span>{p.equipo_local}</span><strong>{p.goles_local ?? "-"}</strong>
      </div>
      <div className={`tt-llave-equipo ${ganaVisita ? "ganador" : ""}`}>
        <span>{p.equipo_visita}</span><strong>{p.goles_visita ?? "-"}</strong>
      </div>
    </div>
  );
}

function Llave({ rondas }) {
  if (!rondas.length) return <p className="text-body-secondary">La llave se arma cuando el organizador inicia el torneo.</p>;
  return (
    <div className="tt-llave">
      {rondas.map((r) => (
        <div key={r.id_ronda} className="tt-llave-columna">
          <h6>{r.nombre}</h6>
          <div className="tt-llave-partidos">
            {r.partidos.map((p) => <Marcador key={p.id_partido} p={p} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Llave;
