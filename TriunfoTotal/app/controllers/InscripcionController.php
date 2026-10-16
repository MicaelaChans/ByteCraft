<?php
// app/controllers/InscripcionController.php
//
// Inscripción de participantes/equipos a un torneo.
//  - Un CAPITÁN pide inscribir su equipo  -> queda Pendiente.
//  - En torneos individuales el usuario se inscribe a sí mismo.
//  - El ORGANIZADOR acepta/rechaza, o inscribe directo (queda Aceptada).

class InscripcionController extends Controlador {

    /** POST /torneos/{id}/inscripciones   body: { id_equipo?, directo? } */
    public function inscribir(int $idTorneo): void {
        $yo = Sesion::exigirLogin();
        $idYo = (int)$yo['id_usuario'];
        $torneo = TorneoController::cargarVisible($idTorneo);
        $datos = $this->cuerpo();
        $inscripciones = new Inscripcion();
        $equipos = new Equipo();

        $this->exigirInscripcionAbierta($torneo);

        $directo = !empty($datos['directo']) && TorneoController::puedeGestionar($torneo);

        if ($directo) {
            // El organizador inscribe a un equipo existente
            $idEquipo = (int)($datos['id_equipo'] ?? 0);
            $equipo = $equipos->buscar($idEquipo);
            if (!$equipo) {
                throw new HttpError(404, 'El equipo no existe.');
            }
            if (($torneo['modalidad'] === 'Individual') !== (bool)$equipo['es_individual']) {
                throw new HttpError(422, $torneo['modalidad'] === 'Individual'
                    ? 'Este torneo es individual: solo se pueden inscribir participantes individuales.'
                    : 'Este torneo es por equipos: no se pueden inscribir participantes individuales.');
            }
        } elseif ($torneo['modalidad'] === 'Individual') {
            $idEquipo = $equipos->individualDe($idYo);
        } else {
            $idEquipo = (int)($datos['id_equipo'] ?? 0);
            $equipo = $equipos->buscar($idEquipo);
            if (!$equipo || $equipo['es_individual']) {
                throw new HttpError(422, 'Elegí uno de tus equipos para inscribir.');
            }
            if (!$equipos->esCapitan($idEquipo, $idYo)) {
                throw new HttpError(403, 'Solo el capitán puede inscribir al equipo.');
            }
        }

        if (!$directo && $inscripciones->usuarioYaInscripto($idTorneo, $idYo)) {
            throw new HttpError(409, 'Ya estás inscripto en este torneo.');
        }

        $existente = $inscripciones->buscar($idTorneo, $idEquipo);
        if ($existente && $existente['estado_inscripcion'] !== 'Rechazada') {
            throw new HttpError(409, 'Ese equipo ya está inscripto en este torneo.');
        }

        $estado = $directo ? 'Aceptada' : 'Pendiente';
        if ($estado === 'Aceptada') {
            $this->exigirCupo($torneo);
        }
        if ($existente) {
            $inscripciones->cambiarEstado($idTorneo, $idEquipo, $estado); // re-inscripción tras rechazo
        } else {
            $inscripciones->crear($idTorneo, $idEquipo, $estado);
        }

        $notif = new Notificacion();
        if ($directo) {
            $notif->aEquipo($idEquipo, 'Inscripcion_Aceptada',
                "Te inscribieron en el torneo \"{$torneo['nombre']}\".", 'torneo', $idTorneo);
        } else {
            $notif->crear((int)$torneo['id_organizador'], 'Solicitud_Inscripcion',
                "Nueva solicitud de inscripción en \"{$torneo['nombre']}\".", 'torneo', $idTorneo);
        }

        $this->ok([
            'estado' => $estado,
            'mensaje' => $directo ? 'Equipo inscripto.' : 'Solicitud enviada. El organizador tiene que aceptarla.',
        ], 201);
    }

    /** PUT /torneos/{id}/inscripciones/{idEquipo}   body: { estado: Aceptada|Rechazada } */
    public function resolver(int $idTorneo, int $idEquipo): void {
        $torneo = TorneoController::cargarParaGestionar($idTorneo);
        $this->exigirInscripcionAbierta($torneo, false);

        $v = new Validador($this->cuerpo());
        $estado = $v->opcion('estado', 'El estado', ['Aceptada', 'Rechazada']);
        $v->validar();

        $inscripciones = new Inscripcion();
        if (!$inscripciones->buscar($idTorneo, $idEquipo)) {
            throw new HttpError(404, 'Esa inscripción no existe.');
        }
        if ($estado === 'Aceptada') {
            $this->exigirCupo($torneo);
        }
        $inscripciones->cambiarEstado($idTorneo, $idEquipo, $estado);

        (new Notificacion())->aEquipo($idEquipo,
            $estado === 'Aceptada' ? 'Inscripcion_Aceptada' : 'Inscripcion_Rechazada',
            ($estado === 'Aceptada' ? 'Aceptaron' : 'Rechazaron') . " tu inscripción en \"{$torneo['nombre']}\".",
            'torneo', $idTorneo);

        $this->ok(['mensaje' => "Inscripción $estado."]);
    }

    /** DELETE /torneos/{id}/inscripciones/{idEquipo}  (el capitán se baja o el organizador lo saca) */
    public function retirar(int $idTorneo, int $idEquipo): void {
        $yo = Sesion::exigirLogin();
        $torneo = TorneoController::cargarVisible($idTorneo);
        $esGestor = TorneoController::puedeGestionar($torneo);

        if (!$esGestor && !(new Equipo())->esCapitan($idEquipo, (int)$yo['id_usuario'])) {
            throw new HttpError(403, 'Solo el capitán del equipo o el organizador pueden retirar la inscripción.');
        }
        if ($torneo['estado_torneo'] !== 'Borrador') {
            throw new HttpError(409, 'El torneo ya empezó: no se pueden retirar inscripciones.');
        }
        (new Inscripcion())->eliminar($idTorneo, $idEquipo);
        $this->ok(['mensaje' => 'Inscripción retirada.']);
    }

    private function exigirInscripcionAbierta(array $torneo, bool $exigirAprobado = true): void {
        if ($exigirAprobado && $torneo['estado_aprobacion'] !== 'Aprobado') {
            throw new HttpError(409, 'El torneo todavía no fue aprobado por un administrador.');
        }
        if ($torneo['estado_torneo'] !== 'Borrador') {
            throw new HttpError(409, 'Las inscripciones están cerradas: el torneo ya empezó.');
        }
    }

    private function exigirCupo(array $torneo): void {
        if ((new Inscripcion())->cantidadAceptados((int)$torneo['id_torneo']) >= (int)$torneo['max_equipos']) {
            throw new HttpError(409, 'El torneo ya está completo (' . $torneo['max_equipos'] . ' participantes).');
        }
    }
}
