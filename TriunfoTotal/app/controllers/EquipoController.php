<?php
// app/controllers/EquipoController.php
//
// Módulo de gestión de participantes y equipos.
// El que crea el equipo queda como CAPITÁN y es quien lo administra.

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

    /** GET /equipos/mios */
    public function mios(): void {
        $yo = Sesion::exigirLogin();
        $this->ok((new Equipo())->deUsuario((int)$yo['id_usuario']));
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

    /** POST /equipos/{id}/miembros  body: { usuario: email o alias } */
    public function agregarMiembro(int $id): void {
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
        $equipos = new Equipo();
        if ($equipos->esMiembro($id, (int)$usuario['id_usuario'])) {
            throw new HttpError(409, 'Esa persona ya es parte del equipo.');
        }
        $equipos->agregarMiembro($id, (int)$usuario['id_usuario']);
        (new Notificacion())->crear((int)$usuario['id_usuario'], 'Sistema',
            "Te agregaron al equipo \"{$equipo['nombre']}\".", 'equipo', $id);
        $this->ok($equipos->buscar($id), 201);
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
