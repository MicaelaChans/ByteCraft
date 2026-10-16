<?php
// app/controllers/CompetenciaController.php
//
// Desarrollo de la competencia: iniciar el torneo (genera enfrentamientos),
// cargar/corregir resultados, programar partidos y cerrar rondas.
// Delegamos el "cómo" a cada módulo (Liga / Eliminación / Suizo).

class CompetenciaController extends Controlador {

    /** POST /torneos/{id}/iniciar */
    public function iniciar(int $idTorneo): void {
        $torneo = TorneoController::cargarParaGestionar($idTorneo);

        if ($torneo['estado_aprobacion'] !== 'Aprobado') {
            throw new HttpError(409, 'El torneo tiene que estar aprobado para poder iniciarlo.');
        }
        if ($torneo['estado_torneo'] !== 'Borrador') {
            throw new HttpError(409, 'El torneo ya fue iniciado.');
        }

        $modulo = ModuloCompetencia::para($torneo['formato']);
        $inscripciones = new Inscripcion();
        $equipos = $inscripciones->aceptados($idTorneo);
        if (count($equipos) < $modulo->minimoParticipantes()) {
            throw new HttpError(409, 'Hacen falta al menos ' . $modulo->minimoParticipantes() .
                ' participantes aceptados para iniciar (hay ' . count($equipos) . ').');
        }

        $modeloTorneo = new Torneo();
        $modeloTorneo->transaccion(function () use ($modulo, $torneo, $equipos, $idTorneo, $inscripciones, $modeloTorneo) {
            // Las solicitudes que quedaron pendientes se rechazan automáticamente
            foreach ($inscripciones->deTorneo($idTorneo) as $i) {
                if ($i['estado_inscripcion'] === 'Pendiente') {
                    $inscripciones->cambiarEstado($idTorneo, (int)$i['id_equipo'], 'Rechazada');
                }
            }
            $modulo->iniciar($torneo, $equipos);
            $modeloTorneo->cambiarEstado($idTorneo, 'En Proceso');
            (new Posicion())->recalcular($idTorneo); // tabla con todos en 0
        });

        $notif = new Notificacion();
        foreach ($equipos as $idEquipo) {
            $notif->aEquipo($idEquipo, 'Partido_Programado',
                "¡Empezó el torneo \"{$torneo['nombre']}\"! Ya podés ver tus partidos.", 'torneo', $idTorneo);
        }
        $this->ok(['mensaje' => 'Torneo iniciado: se generaron los enfrentamientos.']);
    }

    /**
     * PUT /partidos/{id}
     * body: { goles_local, goles_visita, fecha_partido?, estado? ('Finalizado'|'Jugando') }
     *   o solo { fecha_partido } para programar el partido.
     */
    public function actualizarPartido(int $idPartido): void {
        $partidos = new Partido();
        $partido = $partidos->buscar($idPartido);
        if (!$partido) {
            throw new HttpError(404, 'El partido no existe.');
        }
        $torneo = TorneoController::cargarParaGestionar((int)$partido['id_torneo']);
        $datos = $this->cuerpo();
        $v = new Validador($datos);

        if ($partido['id_equipo_visita'] === null) {
            throw new HttpError(409, 'Es un BYE (pasa directo): no tiene resultado para cargar.');
        }
        if ($torneo['estado_torneo'] === 'Finalizado' && !Sesion::esAdmin()) {
            throw new HttpError(409, 'El torneo ya terminó. Solo un administrador puede corregir resultados.');
        }

        $fecha = $v->fechaHora('fecha_partido', 'La fecha del partido');

        // Solo programar fecha/hora
        if (!array_key_exists('goles_local', $datos) && !array_key_exists('goles_visita', $datos)) {
            $v->validar();
            $partidos->programar($idPartido, $fecha);
            (new Notificacion())->aEquipo((int)$partido['id_equipo_local'], 'Partido_Programado',
                "Partido programado: {$partido['equipo_local']} vs {$partido['equipo_visita']}.", 'torneo', (int)$torneo['id_torneo']);
            (new Notificacion())->aEquipo((int)$partido['id_equipo_visita'], 'Partido_Programado',
                "Partido programado: {$partido['equipo_local']} vs {$partido['equipo_visita']}.", 'torneo', (int)$torneo['id_torneo']);
            $this->ok($partidos->buscar($idPartido));
            return;
        }

        $gl = $v->entero('goles_local', 'El resultado del local', 0, 999);
        $gv = $v->entero('goles_visita', 'El resultado de la visita', 0, 999);
        $estado = $v->opcion('estado', 'El estado', ['Jugando', 'Finalizado'], false, 'Finalizado');
        $v->validar();

        $modulo = ModuloCompetencia::para($torneo['formato']);
        if ($estado === 'Finalizado' && $gl === $gv && !$modulo->permiteEmpates()) {
            throw new HttpError(422, 'En eliminación directa no puede haber empate: cargá el resultado con la definición (ej: penales).');
        }

        // "Corregir resultados si cuenta con autorización": una ronda CERRADA
        // solo la corrige un admin, y en eliminación solo si es la última ronda
        // (si no, cambiaría quién pasó a la ronda siguiente).
        if ($partido['ronda_estado'] === 'Cerrada') {
            if (!Sesion::esAdmin()) {
                throw new HttpError(403, 'Esa ronda está cerrada. Solo un administrador puede corregir el resultado.');
            }
            $ultima = (new Ronda())->ultima((int)$torneo['id_torneo']);
            if ($torneo['formato'] !== 'Liga' && (int)$ultima['id_ronda'] !== (int)$partido['id_ronda']) {
                throw new HttpError(409, 'No se puede corregir: ya se generaron rondas posteriores con este resultado.');
            }
        }

        $partidos->guardarResultado($idPartido, $gl, $gv, $estado, $fecha);
        // Si un admin corrige la final de una eliminación, se actualiza el campeón
        if ($torneo['estado_torneo'] === 'Finalizado' && $torneo['formato'] === 'Eliminacion') {
            (new Torneo())->cambiarEstado((int)$torneo['id_torneo'], 'Finalizado', Partido::ganador($partidos->buscar($idPartido)));
        }
        $this->ok($partidos->buscar($idPartido));
    }

    /** POST /rondas/{id}/cerrar -> cierra la ronda y avanza el torneo */
    public function cerrarRonda(int $idRonda): void {
        $rondas = new Ronda();
        $ronda = $rondas->buscar($idRonda);
        if (!$ronda) {
            throw new HttpError(404, 'La ronda no existe.');
        }
        $torneo = TorneoController::cargarParaGestionar((int)$ronda['id_torneo']);

        if ($ronda['estado'] === 'Cerrada') {
            throw new HttpError(409, 'La ronda ya está cerrada.');
        }
        $pendientes = (new Partido())->pendientesEnRonda($idRonda);
        if ($pendientes > 0) {
            throw new HttpError(409, "Faltan cargar $pendientes resultado(s) para cerrar la ronda.");
        }

        $modeloTorneo = new Torneo();
        $resultado = $modeloTorneo->transaccion(function () use ($rondas, $idRonda, $torneo, $modeloTorneo) {
            $rondas->cerrar($idRonda);
            $paso = ModuloCompetencia::para($torneo['formato'])->siguientePaso($torneo);
            if ($paso['finalizado']) {
                $modeloTorneo->cambiarEstado((int)$torneo['id_torneo'], 'Finalizado', $paso['id_campeon']);
            }
            return $paso;
        });

        if ($resultado['finalizado']) {
            $notif = new Notificacion();
            foreach ((new Inscripcion())->aceptados((int)$torneo['id_torneo']) as $idEquipo) {
                $notif->aEquipo($idEquipo, 'Resultado_Actualizado',
                    "Terminó el torneo \"{$torneo['nombre']}\". ¡Mirá la tabla final!", 'torneo', (int)$torneo['id_torneo']);
            }
        }
        $this->ok($resultado);
    }
}
