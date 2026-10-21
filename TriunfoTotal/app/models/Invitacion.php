<?php
// app/models/Invitacion.php
//
// MODELO de invitaciones a equipos (tabla equipo_invitaciones).
// El capitán invita, el invitado acepta o rechaza. Solo al aceptar
// pasa a ser miembro (equipo_miembros): nadie entra a un equipo sin querer.

class Invitacion extends Modelo {

    public function buscar(int $idEquipo, int $idUsuario): array|false {
        return $this->uno('SELECT * FROM equipo_invitaciones WHERE id_equipo = ? AND id_usuario = ?', [$idEquipo, $idUsuario]);
    }

    /** Crea la invitación, o la reactiva si antes había sido rechazada/cancelada. */
    public function crear(int $idEquipo, int $idUsuario, int $idInvitador): void {
        $this->ejecutar(
            "INSERT INTO equipo_invitaciones (id_equipo, id_usuario, id_invitador, estado)
             VALUES (?, ?, ?, 'Pendiente')
             ON DUPLICATE KEY UPDATE estado = 'Pendiente', id_invitador = VALUES(id_invitador),
                                     creado_en = NOW(), respondida_en = NULL",
            [$idEquipo, $idUsuario, $idInvitador]);
    }

    public function cambiarEstado(int $idEquipo, int $idUsuario, string $estado): void {
        $this->ejecutar('UPDATE equipo_invitaciones SET estado = ?, respondida_en = NOW() WHERE id_equipo = ? AND id_usuario = ?',
            [$estado, $idEquipo, $idUsuario]);
    }

    /** Invitaciones pendientes que RECIBIÓ un usuario. */
    public function recibidas(int $idUsuario): array {
        return $this->todos(
            "SELECT i.id_equipo, i.creado_en, e.nombre AS equipo,
                    CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS invitador,
                    (SELECT COUNT(*) FROM equipo_miembros m WHERE m.id_equipo = e.id_equipo) AS cantidad_miembros
               FROM equipo_invitaciones i
               JOIN equipos e ON e.id_equipo = i.id_equipo
               LEFT JOIN usuarios u ON u.id_usuario = i.id_invitador
              WHERE i.id_usuario = ? AND i.estado = 'Pendiente'
              ORDER BY i.creado_en DESC",
            [$idUsuario]);
    }

    /** Invitaciones pendientes que ENVIÓ un equipo (las ve el capitán). */
    public function pendientesDeEquipo(int $idEquipo): array {
        return $this->todos(
            "SELECT i.id_usuario, i.creado_en, u.nombre, u.apellido, u.alias
               FROM equipo_invitaciones i JOIN usuarios u ON u.id_usuario = i.id_usuario
              WHERE i.id_equipo = ? AND i.estado = 'Pendiente'
              ORDER BY i.creado_en",
            [$idEquipo]);
    }
}
