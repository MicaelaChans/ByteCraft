<?php
// app/controllers/EquipoController.php
//
// Módulo de gestión de participantes y equipos.
// El que crea el equipo queda como CAPITÁN y es quien lo administra.
// Para sumar gente, el capitán INVITA y la persona acepta o rechaza.

class EquipoController extends Controlador {

    /** GET /equipos?q=  (búsqueda, la usa el organizador para inscribir directo) */
    public function buscar(): void {
        Sesion::exigirLogin();
        $q = $this->query('q', '');
        if (mb_strlen($q) < 2) {
            $this->ok([]);
            return;
        }
        $this->ok((new Equipo())->buscarPorNombre($q));
    }

    /** GET /equipos/mios  (al capitán también le muestra las invitaciones que mandó) */
    public function mios(): void {
        $yo = Sesion::exigirLogin();
        $invitaciones = new Invitacion();
        $equipos = (new Equipo())->deUsuario((int)$yo['id_usuario']);
        foreach ($equipos as &$e) {
            $e['invitaciones_pendientes'] = $e['rol_en_equipo'] === 'Capitan'
                ? $invitaciones->pendientesDeEquipo((int)$e['id_equipo']) : [];
        }
        $this->ok($equipos);
    }

    /** GET /equipos/{id} */
    public function detalle(int $id): void {
        $equipo = (new Equipo())->buscar($id);
        if (!$equipo) {
            throw new HttpError(404, 'El equipo no existe.');
        }
        $this->ok($equipo);
    }

    /** POST /equipos  body: { nombre } */
    public function crear(): void {
        $yo = Sesion::exigirLogin();
        $v = new Validador($this->cuerpo());
        $nombre = $v->texto('nombre', 'El nombre del equipo', 3, 100);
        $v->validar();

        $equipos = new Equipo();
        $id = $equipos->crear($nombre, (int)$yo['id_usuario']);
        $this->ok($equipos->buscar($id), 201);
    }

    /** PUT /equipos/{id}  body: { nombre } */
    public function renombrar(int $id): void {
        $this->exigirCapitan($id);
        $v = new Validador($this->cuerpo());
        $nombre = $v->texto('nombre', 'El nombre del equipo', 3, 100);
        $v->validar();
        (new Equipo())->renombrar($id, $nombre);
        $this->ok((new Equipo())->buscar($id));
    }

    /** DELETE /equipos/{id} */
    public function eliminar(int $id): void {
        $this->exigirCapitan($id);
        $equipos = new Equipo();
        if ($equipos->tienePartidos($id)) {
            throw new HttpError(409, 'El equipo ya jugó partidos: no se puede borrar para no perder el historial.');
        }
        $equipos->eliminar($id);
        $this->ok(['mensaje' => 'Equipo eliminado.']);
    }

    /** POST /equipos/{id}/invitaciones  body: { usuario: email o alias } */
    public function invitar(int $id): void {
        $yo = Sesion::exigirLogin();
        $equipo = $this->exigirCapitan($id);
        if ($equipo['es_individual']) {
            throw new HttpError(409, 'Un participante individual no puede tener más miembros.');
        }
        $datos = $this->cuerpo();
        $texto = trim((string)($datos['usuario'] ?? ''));
        if ($texto === '') {
            throw new HttpError(422, 'Escribí el email o alias de la persona.');
        }
        $usuario = (new Usuario())->buscarPorEmailOAlias($texto);
        if (!$usuario || $usuario['estado'] !== 'Activo') {
            throw new HttpError(404, 'No encontramos un usuario activo con ese email o alias.');
        }
        $idInvitado = (int)$usuario['id_usuario'];
        if ((new Equipo())->esMiembro($id, $idInvitado)) {
            throw new HttpError(409, 'Esa persona ya es parte del equipo.');
        }
        $invitaciones = new Invitacion();
        $previa = $invitaciones->buscar($id, $idInvitado);
        if ($previa && $previa['estado'] === 'Pendiente') {
            throw new HttpError(409, 'Ya le mandaste una invitación: está esperando que responda.');
        }

        $invitaciones->crear($id, $idInvitado, (int)$yo['id_usuario']);
        (new Notificacion())->crear($idInvitado, 'Invitacion_Equipo',
            "{$yo['nombre']} te invitó a unirte al equipo \"{$equipo['nombre']}\".", 'equipo', $id);
        $this->ok(['mensaje' => "Invitación enviada a {$usuario['nombre']}. Cuando acepte, va a aparecer en el equipo."], 201);
    }

    /** DELETE /equipos/{id}/invitaciones/{idUsuario}  (el capitán cancela una invitación) */
    public function cancelarInvitacion(int $id, int $idUsuario): void {
        $this->exigirCapitan($id);
        $invitaciones = new Invitacion();
        $inv = $invitaciones->buscar($id, $idUsuario);
        if (!$inv || $inv['estado'] !== 'Pendiente') {
            throw new HttpError(404, 'No hay una invitación pendiente para esa persona.');
        }
        $invitaciones->cambiarEstado($id, $idUsuario, 'Cancelada');
        $this->ok(['mensaje' => 'Invitación cancelada.']);
    }

    /** GET /invitaciones  -> invitaciones pendientes que recibí */
    public function invitacionesRecibidas(): void {
        $yo = Sesion::exigirLogin();
        $this->ok((new Invitacion())->recibidas((int)$yo['id_usuario']));
    }

    /** PUT /invitaciones/{idEquipo}   body: { aceptar: true|false } */
    public function responderInvitacion(int $idEquipo): void {
        $yo = Sesion::exigirLogin();
        $idYo = (int)$yo['id_usuario'];
        $aceptar = filter_var($this->cuerpo()['aceptar'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $invitaciones = new Invitacion();
        $inv = $invitaciones->buscar($idEquipo, $idYo);   // solo la propia: nadie responde por otro
        if (!$inv || $inv['estado'] !== 'Pendiente') {
            throw new HttpError(404, 'No tenés una invitación pendiente de ese equipo.');
        }
        $equipos = new Equipo();
        $equipo = $equipos->buscar($idEquipo);

        $equipos->transaccion(function () use ($aceptar, $equipos, $invitaciones, $idEquipo, $idYo) {
            $invitaciones->cambiarEstado($idEquipo, $idYo, $aceptar ? 'Aceptada' : 'Rechazada');
            if ($aceptar && !$equipos->esMiembro($idEquipo, $idYo)) {
                $equipos->agregarMiembro($idEquipo, $idYo);
            }
        });

        if ($inv['id_invitador']) {
            (new Notificacion())->crear((int)$inv['id_invitador'], 'Sistema',
                "{$yo['nombre']} " . ($aceptar ? 'aceptó' : 'rechazó') . " la invitación al equipo \"{$equipo['nombre']}\".",
                'equipo', $idEquipo);
        }
        $this->ok(['mensaje' => $aceptar ? "¡Ya sos parte de \"{$equipo['nombre']}\"!" : 'Invitación rechazada.']);
    }

    /** DELETE /equipos/{id}/miembros/{idUsuario}  (el capitán saca a alguien, o uno se va) */
    public function quitarMiembro(int $id, int $idUsuario): void {
        $yo = Sesion::exigirLogin();
        $equipos = new Equipo();
        $esCapitan = $equipos->esCapitan($id, (int)$yo['id_usuario']);
        if (!$esCapitan && (int)$yo['id_usuario'] !== $idUsuario) {
            throw new HttpError(403, 'Solo el capitán puede sacar a otros miembros.');
        }
        if ($equipos->esCapitan($id, $idUsuario)) {
            throw new HttpError(409, 'El capitán no puede salir del equipo (si querés, eliminá el equipo).');
        }
        $equipos->quitarMiembro($id, $idUsuario);
        $this->ok($equipos->buscar($id));
    }

    private function exigirCapitan(int $id): array {
        $yo = Sesion::exigirLogin();
        $equipos = new Equipo();
        $equipo = $equipos->buscar($id);
        if (!$equipo) {
            throw new HttpError(404, 'El equipo no existe.');
        }
        if (!$equipos->esCapitan($id, (int)$yo['id_usuario']) && !Sesion::esAdmin()) {
            throw new HttpError(403, 'Solo el capitán puede administrar el equipo.');
        }
        return $equipo;
    }
}
