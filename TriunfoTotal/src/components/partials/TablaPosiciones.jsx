// Tabla de posiciones (liga y suizo). Los números los calcula la base de datos.

function TablaPosiciones({ posiciones, resaltar = [] }) {
  if (!posiciones.length) {
    return <p className="text-body-secondary">La tabla aparece cuando empieza el torneo.</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle tt-tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Participante</th>
            <th title="Partidos jugados">PJ</th>
            <th title="Ganados">G</th>
            <th title="Empatados">E</th>
            <th title="Perdidos">P</th>
            <th className="d-none d-sm-table-cell" title="Goles/tantos a favor">GF</th>
            <th className="d-none d-sm-table-cell" title="Goles/tantos en contra">GC</th>
            <th title="Diferencia">DIF</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {posiciones.map((p) => (
            <tr key={p.id_equipo} className={resaltar.includes(p.id_equipo) ? "table-info" : ""}>
              <td>{p.posicion}</td>
              <td>{p.equipo}</td>
              <td>{p.partidos_jugados}</td>
              <td>{p.ganados}</td>
              <td>{p.empatados}</td>
              <td>{p.perdidos}</td>
              <td className="d-none d-sm-table-cell">{p.goles_favor}</td>
              <td className="d-none d-sm-table-cell">{p.goles_contra}</td>
              <td>{p.diferencia_goles > 0 ? `+${p.diferencia_goles}` : p.diferencia_goles}</td>
              <td><strong>{p.puntos}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TablaPosiciones;
