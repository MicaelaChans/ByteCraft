<?php
// app/controllers/TorneoController.php
//
// Módulo de torneos: listado público, detalle, crear/editar/eliminar.
// Permisos (roles dinámicos):
//   - Cualquier usuario logueado puede crear torneos.
//   - Solo el ORGANIZADOR de ese torneo (o un admin) puede editarlo/gestionarlo.
//   - Los torneos formales pendientes/rechazados solo los ven su organizador y los admins.

class TorneoController extends Controlador {

    /** GET /torneos?q=&id_disciplina=&formato=&modalidad=&estado_torneo= */
    public function listar(): void {
        $filtros = [];
        foreach (['q', 'id_disciplina', 'formato', 'modalidad', 'estado_torneo', 'tipo', 'limite'] as $clave) {
            $filtros[$clave] = $this->query($clave);
        }
        $this->ok((new Torneo())->listarPublicos($filtros));
    }

    /** GET /torneos/{id} -> todo lo necesario para la página de detalle */
    public function detalle(int $id): void {
        $torneo = self::cargarVisible($id);
        $yo = Sesion::usuario();
        $puedeGestionar = self::puedeGestionar($torneo);

        $inscripciones = (new Inscripcion())->deTorneo($id);
        if (!$puedeGestionar) {
            // El público solo ve los aceptados
            $inscripciones = array_values(array_filter($inscripciones, fn($i) => $i['estado_inscripcion'] === 'Aceptada'));
        }

        $rondas = (new Ronda())->deTorneo($id);
        $partidos = (new Partido())->deTorneo($id);
        foreach ($rondas as &$r) {
            $r['partidos'] = array_values(array_filter($partidos, fn($p) => $p['id_ronda'] == $r['id_ronda']));
        }

        $miInscripcion = null;
        if ($yo) {
            foreach ((new Inscripcion())->deTorneo($id) as $i) {
                if ((new Equipo())->esMiembro((int)$i['id_equipo'], (int)$yo['id_usuario'])) {
                    $miInscripcion = $i;
                    break;
                }
            }
        }

        $this->ok([
            'torneo'        => $torneo,
            'inscripciones' => $inscripciones,
            'rondas'        => $rondas,
            'posiciones'    => (new Posicion())->tabla($id),
            'permisos'      => [
                'puede_gestionar' => $puedeGestionar,
                'es_organizador'  => $yo && (int)$torneo['id_organizador'] === (int)$yo['id_usuario'],
                'mi_inscripcion'  => $miInscripcion,
                'puede_inscribirse' => $yo !== null && $miInscripcion === null
                    && $torneo['estado_aprobacion'] === 'Aprobado' && $torneo['estado_torneo'] === 'Borrador'
                    && (int)$torneo['inscriptos'] < (int)$torneo['max_equipos'],
            ],
        ]);
    }

    /** POST /torneos */
    public function crear(): void {
        $yo = Sesion::exigirLogin();
        $datos = $this->validarDatos($this->cuerpo());

        $id = (new Torneo())->crear((int)$yo['id_usuario'], $datos);
        $torneo = (new Torneo())->buscar($id);

        // Los torneos formales necesitan un admin: les llega un aviso a la campanita
        if ($torneo['estado_aprobacion'] === 'Pendiente') {
            (new Notificacion())->aAdmins("Nuevo torneo formal para aprobar: \"{$torneo['nombre']}\".",
                $id, (int)$yo['id_usuario']);
        }

        $this->ok([
            'torneo' => $torneo,
            'mensaje' => $torneo['tipo'] === 'Formal'
                ? 'Torneo creado. Al ser FORMAL queda pendiente de aprobación por un administrador.'
                : 'Torneo informal creado y publicado automáticamente.',
        ], 201);
    }

    /** PUT /torneos/{id} */
    public function actualizar(int $id): void {
        $torneo = self::cargarParaGestionar($id);
        if ($torneo['estado_torneo'] !== 'Borrador') {
            throw new HttpError(409, 'Solo se puede editar un torneo que todavía no empezó.');
        }
        $datos = $this->validarDatos($this->cuerpo(), $torneo);
        $modelo = new Torneo();
        $modelo->actualizar($id, $datos);

        // Si estaba rechazado y sigue siendo formal, al corregirlo vuelve a revisión
        if ($torneo['estado_aprobacion'] === 'Rechazado' && $datos['tipo'] === 'Formal') {
            $modelo->reenviarAAprobacion($id);
        }
        $actualizado = $modelo->buscar($id);

        // Pasó a Pendiente (lo cambiaron a formal o lo reenviaron): avisar a los admins
        if ($torneo['estado_aprobacion'] !== 'Pendiente' && $actualizado['estado_aprobacion'] === 'Pendiente') {
            (new Notificacion())->aAdmins("Torneo formal para revisar: \"{$actualizado['nombre']}\".",
                $id, Sesion::idUsuario());
        }
        $this->ok($actualizado);
    }

    /** DELETE /torneos/{id} */
    public function eliminar(int $id): void {
        $torneo = self::cargarParaGestionar($id);
        if ($torneo['estado_torneo'] !== 'Borrador' && !Sesion::esAdmin()) {
            throw new HttpError(409, 'Un torneo que ya empezó solo lo puede eliminar un administrador.');
        }
        (new Torneo())->eliminar($id);
        $this->ok(['mensaje' => 'Torneo eliminado.']);
    }

    // ------------------------------------------------------------------
    // Ayudas compartidas con otros controladores
    // ------------------------------------------------------------------

    /** Carga el torneo respetando la visibilidad (formales no aprobados son privados). */
    public static function cargarVisible(int $id): array {
        $torneo = (new Torneo())->buscar($id);
        if (!$torneo || ($torneo['estado_aprobacion'] !== 'Aprobado' && !self::puedeGestionar($torneo))) {
            throw new HttpError(404, 'El torneo no existe.');
        }
        return $torneo;
    }

    /** Carga el torneo y exige ser su organizador o admin. */
    public static function cargarParaGestionar(int $id): array {
        Sesion::exigirLogin();
        $torneo = (new Torneo())->buscar($id);
        if (!$torneo) {
            throw new HttpError(404, 'El torneo no existe.');
        }
        if (!self::puedeGestionar($torneo)) {
            throw new HttpError(403, 'Solo el organizador del torneo o un administrador puede hacer esto.');
        }
        return $torneo;
    }

    public static function puedeGestionar(array $torneo): bool {
        $id = Sesion::idUsuario();
        return $id !== null && ((int)$torneo['id_organizador'] === $id || Sesion::esAdmin());
    }

    /** Validación completa de los datos de un torneo (backend). */
    private function validarDatos(array $d, ?array $actual = null): array {
        $v = new Validador($d);
        $datos = [
            'nombre'          => $v->texto('nombre', 'El nombre del torneo', 3, 100),
            'descripcion'     => $v->texto('descripcion', 'La descripción', 0, 2000, false),
            'id_disciplina'   => $v->entero('id_disciplina', 'La disciplina', 1, PHP_INT_MAX),
            'formato'         => $v->opcion('formato', 'El formato', Torneo::FORMATOS),
            'modalidad'       => $v->opcion('modalidad', 'La modalidad', Torneo::MODALIDADES, false, 'Equipos'),
            'tipo'            => $v->opcion('tipo', 'El tipo', Torneo::TIPOS, false, 'Informal'),
            'max_equipos'     => $v->entero('max_equipos', 'La cantidad máxima de participantes', 2, 128),
            'puntos_victoria' => $v->entero('puntos_victoria', 'Los puntos por victoria', 0, 10, false, 3),
            'puntos_empate'   => $v->entero('puntos_empate', 'Los puntos por empate', 0, 10, false, 1),
            'puntos_derrota'  => $v->entero('puntos_derrota', 'Los puntos por derrota', 0, 10, false, 0),
            'ida_y_vuelta'    => $v->booleano('ida_y_vuelta') ? 1 : 0,
            'rondas_suizo'    => $v->entero('rondas_suizo', 'La cantidad de rondas', 1, 20, false),
            'fecha_inicio'    => $v->fecha('fecha_inicio', 'La fecha de inicio'),
            'fecha_fin'       => $v->fecha('fecha_fin', 'La fecha de finalización'),
        ];

        if ($datos['id_disciplina'] && !(new Catalogo())->existeDisciplina($datos['id_disciplina'])) {
            $v->error('id_disciplina', 'La disciplina elegida no existe.');
        }
        if ($datos['formato'] && ($actual === null || $actual['formato'] !== $datos['formato'])
            && !(new Catalogo())->moduloHabilitado($datos['formato'])) {
            $v->error('formato', 'Ese formato de competencia está deshabilitado por el administrador.');
        }
        if ($datos['fecha_inicio'] && $datos['fecha_fin'] && $datos['fecha_fin'] < $datos['fecha_inicio']) {
            $v->error('fecha_fin', 'La fecha de finalización no puede ser anterior a la de inicio.');
        }
        if ($actual === null && $datos['fecha_inicio'] && $datos['fecha_inicio'] < date('Y-m-d')) {
            $v->error('fecha_inicio', 'La fecha de inicio no puede ser en el pasado.');
        }
        if ($datos['puntos_victoria'] !== null && $datos['puntos_empate'] !== null
            && $datos['puntos_victoria'] <= $datos['puntos_empate']) {
            $v->error('puntos_victoria', 'La victoria tiene que valer más que el empate.');
        }
        if ($actual !== null && $datos['max_equipos'] !== null && $datos['max_equipos'] < (int)$actual['inscriptos']) {
            $v->error('max_equipos', 'Ya hay más inscriptos aceptados que ese máximo.');
        }
        if ($datos['formato'] !== 'Suizo') {
            $datos['rondas_suizo'] = null;
        }
        if ($datos['formato'] !== 'Liga') {
            $datos['ida_y_vuelta'] = 0;
        }
        $v->validar();
        return $datos;
    }
}
