<?php
// app/models/Equipo.php
//
// MODELO de equipos y participantes.
// Un participante individual = un equipo con es_individual = 1 y un solo miembro.

class Equipo extends Modelo {

    public function crear(string $nombre, int $idCapitan, bool $individual = false): int {
        return $this->transaccion(function () use ($nombre, $idCapitan, $individual) {
            $this->ejecutar('INSERT INTO equipos (nombre, es_individual, id_creador) VALUES (?, ?, ?)',
                [$nombre, $individual ? 1 : 0, $idCapitan]);
            $id = (int)$this->db->lastInsertId();
            $this->ejecutar("INSERT INTO equipo_miembros (id_equipo, id_usuario, rol_en_equipo) VALUES (?, ?, 'Capitan')",
                [$id, $idCapitan]);
            return $id;
        });
    }

    /** Devuelve el "equipo individual" del usuario; si no existe lo crea. */
    public function individualDe(int $idUsuario): int {
        $id = $this->valor(
            'SELECT e.id_equipo FROM equipos e JOIN equipo_miembros m ON m.id_equipo = e.id_equipo
              WHERE e.es_individual = 1 AND m.id_usuario = ? LIMIT 1', [$idUsuario]);
        if ($id) {
            return (int)$id;
        }
        $u = $this->uno('SELECT nombre, apellido, alias FROM usuarios WHERE id_usuario = ?', [$idUsuario]);
        $nombre = $u['alias'] ?: trim($u['nombre'] . ' ' . ($u['apellido'] ?? ''));
        return $this->crear($nombre, $idUsuario, true);
    }

    public function buscar(int $idEquipo): array|false {
        $equipo = $this->uno('SELECT * FROM equipos WHERE id_equipo = ?', [$idEquipo]);
        if ($equipo) {
            $equipo['miembros'] = $this->miembros($idEquipo);
        }
        return $equipo;
    }

    public function miembros(int $idEquipo): array {
        return $this->todos(
            'SELECT u.id_usuario, u.nombre, u.apellido, u.alias, m.rol_en_equipo
               FROM equipo_miembros m JOIN usuarios u ON u.id_usuario = m.id_usuario
              WHERE m.id_equipo = ? ORDER BY m.rol_en_equipo, u.nombre', [$idEquipo]);
    }

    /** Equipos (no individuales) de los que el usuario es miembro. */
    public function deUsuario(int $idUsuario): array {
        $equipos = $this->todos(
            'SELECT e.id_equipo, e.nombre, e.es_individual, m.rol_en_equipo,
                    (SELECT COUNT(*) FROM equipo_miembros x WHERE x.id_equipo = e.id_equipo) AS cantidad_miembros
               FROM equipos e JOIN equipo_miembros m ON m.id_equipo = e.id_equipo
              WHERE m.id_usuario = ? AND e.es_individual = 0
              ORDER BY e.nombre', [$idUsuario]);
        foreach ($equipos as &$e) {
            $e['miembros'] = $this->miembros((int)$e['id_equipo']);
        }
        return $equipos;
    }

    public function esCapitan(int $idEquipo, int $idUsuario): bool {
        return $this->uno("SELECT 1 FROM equipo_miembros WHERE id_equipo = ? AND id_usuario = ? AND rol_en_equipo = 'Capitan'",
            [$idEquipo, $idUsuario]) !== false;
    }

    public function esMiembro(int $idEquipo, int $idUsuario): bool {
        return $this->uno('SELECT 1 FROM equipo_miembros WHERE id_equipo = ? AND id_usuario = ?', [$idEquipo, $idUsuario]) !== false;
    }

    public function agregarMiembro(int $idEquipo, int $idUsuario): void {
        $this->ejecutar("INSERT INTO equipo_miembros (id_equipo, id_usuario, rol_en_equipo) VALUES (?, ?, 'Jugador')",
            [$idEquipo, $idUsuario]);
    }

    public function quitarMiembro(int $idEquipo, int $idUsuario): void {
        $this->ejecutar('DELETE FROM equipo_miembros WHERE id_equipo = ? AND id_usuario = ?', [$idEquipo, $idUsuario]);
    }

    public function renombrar(int $idEquipo, string $nombre): void {
        $this->ejecutar('UPDATE equipos SET nombre = ? WHERE id_equipo = ?', [$nombre, $idEquipo]);
    }

    /** Un equipo que ya jugó partidos no se borra (rompería el historial). */
    public function tienePartidos(int $idEquipo): bool {
        return $this->uno('SELECT 1 FROM partidos WHERE id_equipo_local = ? OR id_equipo_visita = ? LIMIT 1',
            [$idEquipo, $idEquipo]) !== false;
    }

    public function eliminar(int $idEquipo): void {
        $this->ejecutar('DELETE FROM equipos WHERE id_equipo = ?', [$idEquipo]);
    }

    /** Búsqueda pública de equipos (para que el organizador inscriba directo). */
    public function buscarPorNombre(string $texto): array {
        return $this->todos('SELECT id_equipo, nombre, es_individual FROM equipos WHERE nombre LIKE ? ORDER BY nombre LIMIT 20',
            ['%' . $texto . '%']);
    }
}
