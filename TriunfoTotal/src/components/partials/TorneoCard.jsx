import { Link } from "react-router-dom";
import { FORMATOS, claseEstado, textoEstado, fecha } from "../../utils/formato";

// Tarjeta de torneo para grillas (búsqueda, perfil).
function TorneoCard({ torneo: t, acciones }) {
  return (
    <div className="tt-torneo-card">
      <Link to={`/tournaments/${t.id_torneo}`} className="tt-torneo-card-img">
        <img src={t.imagen} alt={t.disciplina} />
        <span className={`status-badge ${claseEstado(t)}`}>{textoEstado(t)}</span>
      </Link>
      <div className="tt-torneo-card-body">
        <h5>
          <Link to={`/tournaments/${t.id_torneo}`}>{t.nombre}</Link>
        </h5>
        <p className="mb-1">
          {t.disciplina} · {FORMATOS[t.formato]} · {t.modalidad}
        </p>
        <p className="mb-1 text-body-secondary small">
          <i className="bi bi-people me-1"></i>
          {t.inscriptos}/{t.max_equipos} · <i className="bi bi-calendar-event me-1"></i>
          {fecha(t.fecha_inicio)}
          {t.tipo === "Formal" && <span className="badge text-bg-warning ms-2">Formal</span>}
        </p>
        {t.equipo && (
          <p className="mb-1 small">
            Participás con <strong>{t.equipo}</strong> ({t.estado_inscripcion})
          </p>
        )}
        {acciones && <div className="d-flex gap-2 mt-2">{acciones}</div>}
      </div>
    </div>
  );
}

export default TorneoCard;
