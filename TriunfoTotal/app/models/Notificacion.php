<?php
// app/models/Notificacion.php
//
// MODELO de notificaciones internas (campanita del navbar).

class Notificacion extends Modelo {

    public function crear(int $idUsuario, string $tipo, string $mensaje, ?string $refTipo = null, ?int $refId = null): void {
        $this->ejecutar(
            'INSERT INTO notificaciones (id_usuario, tipo, mensaje, referencia_tipo, referencia_id) VALUES (?, ?, ?, ?, ?)',
            [$idUsuario, $tipo, mb_substr($mensaje, 0, 255), $refTipo, $refId]);
    }

    /** Notifica a todos los miembros de un equipo. */
    public function aEquipo(int $idEquipo, string $tipo, string $mensaje, ?string $refTipo = null, ?int $refId = null): void {
        $stmt = $this->db->prepare('SELECT id_usuario FROM equipo_miembros WHERE id_equipo = ?');
        $stmt->execute([$idEquipo]);
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $idUsuario) {
            $this->crear((int)$idUsuario, $tipo, $mensaje, $refTipo, $refId);
        }
    }

    /**
     * Avisa a todos los administradores (menos a quien hizo la acción, si es admin).
     * referencia_tipo 'aprobacion' hace que la campanita lleve al panel de aprobación.
     */
    public function aAdmins(string $mensaje, int $idTorneo, ?int $excepto = null): void {
        foreach ((new Usuario())->idsAdmins() as $idAdmin) {
            if ($idAdmin !== $excepto) {
                $this->crear($idAdmin, 'Sistema', $mensaje, 'aprobacion', $idTorneo);
            }
        }
    }

    public function deUsuario(int $idUsuario, int $limite = 30): array {
        return $this->todos(
            "SELECT * FROM notificaciones WHERE id_usuario = ? ORDER BY creado_en DESC, id_notificacion DESC LIMIT $limite",
            [$idUsuario]);
    }

    public function noLeidas(int $idUsuario): int {
        return (int)$this->valor('SELECT COUNT(*) FROM notificaciones WHERE id_usuario = ? AND leida = 0', [$idUsuario]);
    }

    public function marcarLeida(int $idNotificacion, int $idUsuario): void {
        // El "AND id_usuario" impide marcar notificaciones de otro (control de acceso)
        $this->ejecutar('UPDATE notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?',
            [$idNotificacion, $idUsuario]);
    }

    public function marcarTodas(int $idUsuario): void {
        $this->ejecutar('UPDATE notificaciones SET leida = 1 WHERE id_usuario = ?', [$idUsuario]);
    }
}
