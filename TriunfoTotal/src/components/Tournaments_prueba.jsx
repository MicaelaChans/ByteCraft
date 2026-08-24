import React, { useState, useEffect } from 'react';

export default function Tournaments_prueba() {
  const [torneos, setTorneos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Petición al endpoint PHP
    fetch('http://localhost/tu_proyecto_backend/api/obtener_torneos.php')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setTorneos(data.data);
        }
        setCargando(false);
      })
      .catch((err) => {
        console.error('Error al conectar con la API:', err);
        setCargando(false);
      });
  }, []);

  if (cargando) return <p>Cargando torneos desde la base de datos...</p>;

  return (
    <div className="container mt-4">
      <h2>Torneos Disponibles</h2>
      <div className="row">
        {torneos.map((torneo) => (
          <div className="col-md-4 mb-3" key={torneo.id_torneo}>
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">{torneo.torneo_nombre}</h5>
                <p className="card-text">
                  <strong>Formato:</strong> {torneo.formato} <br />
                  <strong>Tipo:</strong> {torneo.tipo} <br />
                  <strong>Organizador:</strong> {torneo.organizador_nombre}
                </p>
                <span className="badge bg-primary">{torneo.estado_torneo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}