import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Cargando, MensajeError } from "./partials/Cargando";
import api, { qs } from "../services/api";
import { FORMATOS, fecha, fechaHora } from "../utils/formato";
import "../css/styles.css";

// =====================================================================
// Módulo de ADMINISTRACIÓN DEL SISTEMA (solo rol Administrador).
// El backend vuelve a verificar el rol en cada petición (AdminController).
// =====================================================================

function Resumen() {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get("admin/estadisticas").then(setS).catch((e) => setError(e.message)); }, []);
  if (error) return <MensajeError error={error} />;
  if (!s) return <Cargando />;

  const tarjetas = [
    ["Usuarios", s.usuarios, "bi-people"],
    ["Baneados", s.usuarios_baneados, "bi-person-x"],
    ["Equipos", s.equipos, "bi-shield"],
    ["Torneos", s.torneos, "bi-trophy"],
    ["En curso", s.torneos_en_proceso, "bi-play-circle"],
    ["Pendientes de aprobación", s.torneos_pendientes, "bi-hourglass-split"],
    ["Partidos jugados", s.partidos_jugados, "bi-check2-circle"],
    ["Logins fallidos (24 h)", s.logins_fallidos_24h, "bi-exclamation-triangle"],
  ];
  const maxDisc = Math.max(1, ...s.por_disciplina.map((d) => Number(d.cantidad)));

  return (
    <>
      <div className="tt-stats">
        {tarjetas.map(([t, v, icono]) => (
          <div key={t} className="tt-stat">
            <i className={`bi ${icono}`}></i>
            <strong>{v}</strong>
            <span>{t}</span>
          </div>
        ))}
      </div>
      <div className="row g-4 mt-1">
        <div className="col-md-6">
          <h3 className="fs-6">Torneos por disciplina</h3>
          {s.por_disciplina.map((d) => (
            <div key={d.nombre} className="tt-barra">
              <span>{d.nombre}</span>
              <div className="tt-barra-fondo"><div style={{ width: `${(d.cantidad / maxDisc) * 100}%` }}></div></div>
              <strong>{d.cantidad}</strong>
            </div>
          ))}
        </div>
        <div className="col-md-6">
          <h3 className="fs-6">Torneos por formato</h3>
          {s.por_formato.map((f) => (
            <div key={f.formato} className="tt-barra">
              <span>{FORMATOS[f.formato]}</span>
              <div className="tt-barra-fondo"><div style={{ width: `${(f.cantidad / Math.max(1, s.torneos)) * 100}%` }}></div></div>
              <strong>{f.cantidad}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TorneosPendientes() {
  const [lista, setLista] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [motivos, setMotivos] = useState({});

  const cargar = useCallback(() => {
    api.get("admin/torneos/pendientes").then(setLista).catch((e) => setAviso({ tipo: "danger", texto: e.message }));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function resolver(id, aprobado) {
    setAviso(null);
    try {
      const r = await api.put(`admin/torneos/${id}/aprobacion`, { aprobado, motivo: motivos[id] || "" });
      setAviso({ tipo: "success", texto: r.mensaje });
      cargar();
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
    }
  }

  if (!lista) return <Cargando />;
  return (
    <>
      {aviso && <div className={`alert alert-${aviso.tipo}`}>{aviso.texto}</div>}
      {lista.length === 0 && <p className="text-body-secondary">No hay torneos formales esperando aprobación. 🎉</p>}
      {lista.map((t) => (
        <div key={t.id_torneo} className="tt-admin-item">
          <div>
            <h5 className="mb-1"><Link to={`/tournaments/${t.id_torneo}`}>{t.nombre}</Link></h5>
            <p className="mb-1 small">
              {t.disciplina} · {FORMATOS[t.formato]} · {t.modalidad} · hasta {t.max_equipos} participantes
            </p>
            <p className="mb-1 small text-body-secondary">
              Organiza <strong>{t.organizador}</strong> · creado el {fecha(t.creado_en)} · inicio {fecha(t.fecha_inicio)}
            </p>
            {t.descripcion && <p className="mb-0 small">{t.descripcion}</p>}
          </div>
          <div className="tt-admin-acciones">
            <input className="form-control form-control-sm" placeholder="Motivo (obligatorio para rechazar)"
                   value={motivos[t.id_torneo] || ""} aria-label="Motivo de rechazo"
                   onChange={(e) => setMotivos({ ...motivos, [t.id_torneo]: e.target.value })} />
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-success flex-fill" onClick={() => resolver(t.id_torneo, true)}>Aprobar</button>
              <button className="btn btn-sm btn-outline-danger flex-fill" onClick={() => resolver(t.id_torneo, false)}>Rechazar</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function Usuarios() {
  const yo = useSelector((state) => state.user);
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    api.get(`admin/usuarios${qs({ q: busqueda, pagina })}`).then(setDatos).catch((e) => setAviso({ tipo: "danger", texto: e.message }));
  }, [busqueda, pagina]);
  useEffect(() => { cargar(); }, [cargar]);

  async function accion(fn) {
    setAviso(null);
    try {
      const r = await fn();
      setAviso({ tipo: "success", texto: r.mensaje });
      cargar();
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
    }
  }

  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;

  return (
    <>
      <form className="d-flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); setPagina(1); setBusqueda(q); }}>
        <input className="form-control" placeholder="Buscar por nombre, email o alias" value={q}
               onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuarios" />
        <button className="btn btn-outline-primary" type="submit">Buscar</button>
      </form>
      {aviso && <div className={`alert alert-${aviso.tipo}`}>{aviso.texto}</div>}
      {!datos ? <Cargando /> : (
        <>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr><th>#</th><th>Nombre</th><th>Email</th><th>Roles</th><th>Estado</th><th className="text-end">Acciones</th></tr>
              </thead>
              <tbody>
                {datos.usuarios.map((u) => {
                  const esAdmin = u.roles.includes("Administrador");
                  const soyYo = u.id_usuario === yo.id_usuario;
                  return (
                    <tr key={u.id_usuario}>
                      <td>{u.id_usuario}</td>
                      <td>{u.nombre} {u.apellido}{u.alias && <small className="text-body-secondary"> @{u.alias}</small>}</td>
                      <td className="text-break">{u.email}</td>
                      <td>{u.roles.map((r) => (
                        <span key={r} className={`badge me-1 ${r === "Administrador" ? "text-bg-danger" : "text-bg-secondary"}`}>{r}</span>
                      ))}</td>
                      <td>
                        <span className={`badge ${u.estado === "Activo" ? "text-bg-success" : "text-bg-dark"}`}>{u.estado}</span>
                        {!Number(u.email_verificado) && (
                          <span className="badge text-bg-warning ms-1" title="Todavía no confirmó su email">Sin verificar</span>
                        )}
                      </td>
                      <td className="text-end text-nowrap">
                        {!Number(u.email_verificado) && (
                          <button className="btn btn-sm btn-outline-warning me-1" title="Confirmar el email a mano (si el mail no le llegó)"
                                  onClick={() => accion(() => api.put(`admin/usuarios/${u.id_usuario}/verificar`))}>
                            Verificar email
                          </button>
                        )}
                        {!soyYo && (
                          <>
                            <button className="btn btn-sm btn-outline-secondary me-1"
                                    onClick={() => accion(() => api.put(`admin/usuarios/${u.id_usuario}/admin`, { es_admin: !esAdmin }))}>
                              {esAdmin ? "Quitar admin" : "Hacer admin"}
                            </button>
                            <button className={`btn btn-sm ${u.estado === "Activo" ? "btn-outline-danger" : "btn-outline-success"}`}
                                    onClick={() => accion(() => api.put(`admin/usuarios/${u.id_usuario}/estado`,
                                      { estado: u.estado === "Activo" ? "Baneado" : "Activo" }))}>
                              {u.estado === "Activo" ? "Banear" : "Reactivar"}
                            </button>
                          </>
                        )}
                        {soyYo && <small className="text-body-secondary">(vos)</small>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginado pagina={pagina} paginas={paginas} total={datos.total} onCambiar={setPagina} />
        </>
      )}
    </>
  );
}

function Modulos() {
  const [modulos, setModulos] = useState(null);
  const [aviso, setAviso] = useState(null);
  useEffect(() => { api.get("modulos").then(setModulos).catch(() => {}); }, []);

  async function cambiar(m) {
    setAviso(null);
    try {
      setModulos(await api.put("admin/modulos", { codigo: m.codigo, habilitado: !Number(m.habilitado) }));
      setAviso({ tipo: "success", texto: `Módulo ${m.nombre} ${Number(m.habilitado) ? "deshabilitado" : "habilitado"}.` });
    } catch (e) {
      setAviso({ tipo: "danger", texto: e.message });
    }
  }

  if (!modulos) return <Cargando />;
  return (
    <>
      <p className="text-body-secondary">
        Un módulo deshabilitado no se puede elegir al crear torneos nuevos (los torneos existentes siguen funcionando).
      </p>
      {aviso && <div className={`alert alert-${aviso.tipo}`}>{aviso.texto}</div>}
      {modulos.map((m) => (
        <div key={m.codigo} className="tt-admin-item">
          <div>
            <h5 className="mb-1">{m.nombre}</h5>
            <p className="mb-0 small text-body-secondary">{m.descripcion}</p>
          </div>
          <div className="form-check form-switch fs-4">
            <input className="form-check-input" type="checkbox" role="switch" id={`mod-${m.codigo}`}
                   checked={Boolean(Number(m.habilitado))} onChange={() => cambiar(m)} aria-label={`Habilitar ${m.nombre}`} />
          </div>
        </div>
      ))}
    </>
  );
}

function Auditoria() {
  const VACIO = { tabla: "", accion: "", usuario: "", desde: "", hasta: "" };
  const [filtros, setFiltros] = useState(VACIO);
  const [aplicados, setAplicados] = useState(VACIO);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`admin/auditoria${qs({ ...aplicados, pagina })}`).then(setDatos).catch((e) => setError(e.message));
  }, [aplicados, pagina]);

  const cambiar = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;

  return (
    <>
      <p className="text-body-secondary small">
        Cada INSERT, UPDATE y DELETE de la base queda registrado automáticamente por triggers, con el usuario y la IP.
        La aplicación no tiene permiso para borrar este registro.
      </p>
      <form className="tt-filtros mb-3" onSubmit={(e) => { e.preventDefault(); setPagina(1); setAplicados(filtros); }}>
        <select name="tabla" className="form-select" value={filtros.tabla} onChange={cambiar} aria-label="Tabla">
          <option value="">Todas las tablas</option>
          {(datos?.tablas || []).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="accion" className="form-select" value={filtros.accion} onChange={cambiar} aria-label="Acción">
          <option value="">Todas las acciones</option>
          {["INSERT", "UPDATE", "DELETE", "LOGIN", "LOGIN_FALLIDO", "LOGOUT"].map((a) => <option key={a}>{a}</option>)}
        </select>
        <input name="usuario" className="form-control" placeholder="Usuario o email" value={filtros.usuario} onChange={cambiar} aria-label="Usuario" />
        <input name="desde" type="date" className="form-control" value={filtros.desde} onChange={cambiar} aria-label="Desde" />
        <input name="hasta" type="date" className="form-control" value={filtros.hasta} onChange={cambiar} aria-label="Hasta" />
        <button className="btn btn-outline-primary" type="submit">Filtrar</button>
        <a className="btn btn-outline-secondary" href={api.url(`admin/auditoria/csv${qs(aplicados)}`)}>
          <i className="bi bi-download me-1"></i>CSV
        </a>
      </form>
      <MensajeError error={error} />
      {!datos ? <Cargando /> : (
        <>
          <div className="table-responsive">
            <table className="table table-sm small align-middle">
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Tabla</th><th>Acción</th><th>Registro</th><th>Detalle</th><th>IP</th></tr>
              </thead>
              <tbody>
                {datos.registros.map((r) => (
                  <tr key={r.id_auditoria}>
                    <td className="text-nowrap">{fechaHora(r.creado_en)}</td>
                    <td>{r.email || <span className="text-body-secondary">sistema / anónimo</span>}</td>
                    <td>{r.tabla_afectada}</td>
                    <td><span className={`badge tt-accion-${r.accion.toLowerCase()}`}>{r.accion}</span></td>
                    <td>{r.id_registro}</td>
                    <td className="tt-auditoria-desc">{r.descripcion}</td>
                    <td>{r.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginado pagina={pagina} paginas={paginas} total={datos.total} onCambiar={setPagina} />
        </>
      )}
    </>
  );
}

function Paginado({ pagina, paginas, total, onCambiar }) {
  return (
    <div className="d-flex justify-content-between align-items-center">
      <small className="text-body-secondary">{total} registro(s)</small>
      <div className="btn-group">
        <button className="btn btn-sm btn-outline-secondary" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>←</button>
        <span className="btn btn-sm btn-outline-secondary disabled">{pagina} / {paginas}</span>
        <button className="btn btn-sm btn-outline-secondary" disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>→</button>
      </div>
    </div>
  );
}

const PESTANAS = [
  ["resumen", "Resumen", Resumen],
  ["pendientes", "Torneos a aprobar", TorneosPendientes],
  ["usuarios", "Usuarios", Usuarios],
  ["modulos", "Módulos", Modulos],
  ["auditoria", "Auditoría", Auditoria],
];

function AdminPanel() {
  // La pestaña va en la URL (/admin?pestana=pendientes): así la campanita puede abrir una directo
  const [params, setParams] = useSearchParams();
  const pestana = PESTANAS.some(([id]) => id === params.get("pestana")) ? params.get("pestana") : "resumen";
  const setPestana = (id) => setParams({ pestana: id });
  const Activa = PESTANAS.find(([id]) => id === pestana)[2];

  return (
    <div className="container py-4">
      <h1 className="fs-2"><i className="bi bi-shield-lock me-2"></i>Panel de administración</h1>
      <ul className="nav nav-tabs my-3 tt-tabs" role="tablist">
        {PESTANAS.map(([id, texto]) => (
          <li className="nav-item" key={id}>
            <button className={`nav-link ${pestana === id ? "active" : ""}`} role="tab" aria-selected={pestana === id}
                    onClick={() => setPestana(id)}>
              {texto}
            </button>
          </li>
        ))}
      </ul>
      <Activa />
    </div>
  );
}

export default AdminPanel;
