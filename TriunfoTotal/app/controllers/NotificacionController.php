<?php
// app/controllers/NotificacionController.php — campanita de avisos del usuario

class NotificacionController extends Controlador {

    /** GET /notificaciones */
    public function listar(): void {
        $yo = Sesion::exigirLogin();
        $modelo = new Notificacion();
        $this->ok([
            'notificaciones' => $modelo->deUsuario((int)$yo['id_usuario']),
            'no_leidas' => $modelo->noLeidas((int)$yo['id_usuario']),
        ]);
    }

    /** PUT /notificaciones/{id}/leida */
    public function marcarLeida(int $id): void {
        $yo = Sesion::exigirLogin();
        (new Notificacion())->marcarLeida($id, (int)$yo['id_usuario']);
        $this->ok(null);
    }

    /** PUT /notificaciones/leer-todas */
    public function marcarTodas(): void {
        $yo = Sesion::exigirLogin();
        (new Notificacion())->marcarTodas((int)$yo['id_usuario']);
        $this->ok(null);
    }
}
