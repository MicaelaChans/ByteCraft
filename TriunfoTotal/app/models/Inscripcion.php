<?php
// app/models/Inscripcion.php
//
// MODELO de inscripciones (tabla torneo_equipos).

class Inscripcion extends Modelo {

    public function crear(int $idTorneo, int $idEquipo, string $estado = 'Pendiente'): void {
        $this->ejecutar('INSERT INTO torneo_equipos (id_torneo, id_equipo, estado_inscripcion) VALUES (?, ?, ?)',
            [$idTorneo, $idEquipo, $estado]);
    }

    public function buscar(int $idTorneo, int $idEquipo): array|false {
        return $this->uno('SELECT * FROM torneo_equipos WHERE id_torneo = ? AND id_equipo = ?', [$idTorneo, $idEquipo]);
    }

    public function cambiarEstado(int $idTorneo, int $idEquipo, string $estado): void {
        $this->ejecutar('UPDATE torneo_equipos SET estado_inscripcion = ? WHERE id_torneo = ? AND id_equipo = ?',
            [$estado, $idTorneo, $idEquipo]);
    }

    public function eliminar(int $idTorneo, int $idEquipo): void {
        $this->ejecutar('DELETE FROM torneo_equipos WHERE id_torneo = ? AND id_equipo = ?', [$idTorneo, $idEquipo]);
    }

    /** Todas las inscripciones del torneo con nombre del equipo y su capitán. */
    public function deTorneo(int $idTorneo): array {
        return $this->todos(
            "SELECT te.id_equipo, te.estado_inscripcion, te.fecha_inscripcion, e.nombre, e.es_individual,
                    (SELECT m.id_usuario FROM equipo_miembros m
                      WHERE m.id_equipo = e.id_equipo AND m.rol_en_equipo = 'Capitan' LIMIT 1) AS id_capitan,
                    (SELECT COUNT(*) FROM equipo_miembros m WHERE m.id_equipo = e.id_equipo) AS cantidad_miembros
               FROM torneo_equipos te JOIN equipos e ON e.id_equipo = te.id_equipo
              WHERE te.id_torneo = ?
              ORDER BY FIELD(te.estado_inscripcion, 'Pendiente', 'Aceptada', 'Rechazada'), e.nombre",
            [$idTorneo]);
    }

    /** Ids de equipos aceptados (los que juegan). */
    public function aceptados(int $idTorneo): array {
        $stmt = $this->db->prepare("SELECT id_equipo FROM torneo_equipos WHERE id_torneo = ? AND estado_inscripcion = 'Aceptada'");
        $stmt->execute([$idTorneo]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function cantidadAceptados(int $idTorneo): int {
        return count($this->aceptados($idTorneo));
    }

    /** ¿El usuario ya juega este torneo en algún equipo inscripto (no rechazado)? */
    public function usuarioYaInscripto(int $idTorneo, int $idUsuario): bool {
        return $this->uno(
            "SELECT 1 FROM torneo_equipos te JOIN equipo_miembros m ON m.id_equipo = te.id_equipo
              WHERE te.id_torneo = ? AND m.id_usuario = ? AND te.estado_inscripcion <> 'Rechazada' LIMIT 1",
            [$idTorneo, $idUsuario]) !== false;
    }
}
