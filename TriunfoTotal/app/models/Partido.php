<?php
// app/models/Partido.php
//
// MODELO de partidos (enfrentamiento + resultado).
// Al guardar un resultado, el trigger trg_partidos_au recalcula solo la
// tabla de posiciones (sp_recalcular_posiciones).

class Partido extends Modelo {

    private const SELECT = 'SELECT p.*, r.numero AS ronda_numero, r.nombre AS ronda_nombre, r.estado AS ronda_estado,
                                   el.nombre AS equipo_local, ev.nombre AS equipo_visita
                              FROM partidos p
                              LEFT JOIN rondas r   ON r.id_ronda   = p.id_ronda
                              JOIN equipos el      ON el.id_equipo = p.id_equipo_local
                              LEFT JOIN equipos ev ON ev.id_equipo = p.id_equipo_visita';

    /** $visita = null significa BYE: se guarda ya finalizado (pasa directo). */
    public function crear(int $idTorneo, int $idRonda, int $local, ?int $visita, ?string $fecha = null): int {
        $estado = $visita === null ? 'Finalizado' : 'Pendiente';
        $this->ejecutar(
            'INSERT INTO partidos (id_torneo, id_ronda, id_equipo_local, id_equipo_visita, estado, fecha_partido)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$idTorneo, $idRonda, $local, $visita, $estado, $fecha]);
        return (int)$this->db->lastInsertId();
    }

    public function buscar(int $idPartido): array|false {
        return $this->uno(self::SELECT . ' WHERE p.id_partido = ?', [$idPartido]);
    }

    public function deTorneo(int $idTorneo): array {
        return $this->todos(self::SELECT . ' WHERE p.id_torneo = ? ORDER BY r.numero, p.id_partido', [$idTorneo]);
    }

    public function deRonda(int $idRonda): array {
        return $this->todos(self::SELECT . ' WHERE p.id_ronda = ? ORDER BY p.id_partido', [$idRonda]);
    }

    public function guardarResultado(int $idPartido, int $gl, int $gv, string $estado, ?string $fecha): void {
        $this->ejecutar(
            'UPDATE partidos SET goles_local = ?, goles_visita = ?, estado = ?, fecha_partido = COALESCE(?, fecha_partido)
              WHERE id_partido = ?',
            [$gl, $gv, $estado, $fecha, $idPartido]);
    }

    public function programar(int $idPartido, ?string $fecha): void {
        $this->ejecutar('UPDATE partidos SET fecha_partido = ? WHERE id_partido = ?', [$fecha, $idPartido]);
    }

    public function pendientesEnRonda(int $idRonda): int {
        return (int)$this->valor("SELECT COUNT(*) FROM partidos WHERE id_ronda = ? AND estado <> 'Finalizado'", [$idRonda]);
    }

    public function pendientesEnTorneo(int $idTorneo): int {
        return (int)$this->valor("SELECT COUNT(*) FROM partidos WHERE id_torneo = ? AND estado <> 'Finalizado'", [$idTorneo]);
    }

    /** Pares que ya se enfrentaron (para que el suizo no repita). Clave "menor-mayor". */
    public function paresJugados(int $idTorneo): array {
        $pares = [];
        foreach ($this->todos('SELECT id_equipo_local, id_equipo_visita FROM partidos WHERE id_torneo = ? AND id_equipo_visita IS NOT NULL', [$idTorneo]) as $p) {
            $a = (int)$p['id_equipo_local'];
            $b = (int)$p['id_equipo_visita'];
            $pares[min($a, $b) . '-' . max($a, $b)] = true;
        }
        return $pares;
    }

    /** Equipos que ya recibieron BYE (en el suizo nadie recibe dos). */
    public function equiposConBye(int $idTorneo): array {
        $stmt = $this->db->prepare('SELECT id_equipo_local FROM partidos WHERE id_torneo = ? AND id_equipo_visita IS NULL');
        $stmt->execute([$idTorneo]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** Ganador de un partido finalizado (null si fue empate). */
    public static function ganador(array $p): ?int {
        if ($p['id_equipo_visita'] === null) {
            return (int)$p['id_equipo_local'];
        }
        if ($p['goles_local'] === null || $p['goles_visita'] === null || $p['goles_local'] == $p['goles_visita']) {
            return null;
        }
        return (int)($p['goles_local'] > $p['goles_visita'] ? $p['id_equipo_local'] : $p['id_equipo_visita']);
    }
}
