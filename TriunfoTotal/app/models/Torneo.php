<?php
// app/models/Torneo.php
//
// MODELO de torneos. La regla "Informal se aprueba solo / Formal espera al
// admin" la aplica el trigger trg_torneos_before_insert en la base.

class Torneo extends Modelo {

    const FORMATOS    = ['Liga', 'Eliminacion', 'Suizo'];
    const TIPOS       = ['Informal', 'Formal'];
    const MODALIDADES = ['Individual', 'Equipos'];

    // Campos que el organizador puede definir al crear/editar
    private const EDITABLES = ['id_disciplina', 'nombre', 'descripcion', 'formato', 'modalidad', 'tipo',
        'max_equipos', 'puntos_victoria', 'puntos_empate', 'puntos_derrota', 'ida_y_vuelta',
        'rondas_suizo', 'fecha_inicio', 'fecha_fin'];

    public function crear(int $idOrganizador, array $datos): int {
        $campos = array_merge(['id_organizador'], self::EDITABLES);
        $valores = array_merge([$idOrganizador], array_map(fn($c) => $datos[$c] ?? null, self::EDITABLES));
        $this->ejecutar(
            'INSERT INTO torneos (' . implode(', ', $campos) . ') VALUES (' . rtrim(str_repeat('?, ', count($campos)), ', ') . ')',
            $valores
        );
        return (int)$this->db->lastInsertId();
    }

    public function actualizar(int $idTorneo, array $datos): void {
        $sets = implode(', ', array_map(fn($c) => "$c = ?", self::EDITABLES));
        $valores = array_map(fn($c) => $datos[$c] ?? null, self::EDITABLES);
        $valores[] = $idTorneo;
        $this->ejecutar("UPDATE torneos SET $sets WHERE id_torneo = ?", $valores);
    }

    public function eliminar(int $idTorneo): void {
        $this->ejecutar('DELETE FROM torneos WHERE id_torneo = ?', [$idTorneo]);
    }

    public function buscar(int $idTorneo): array|false {
        return $this->uno(
            'SELECT t.*, d.nombre AS disciplina, d.categoria, d.imagen,
                    CONCAT(u.nombre, " ", COALESCE(u.apellido, "")) AS organizador,
                    e.nombre AS campeon,
                    (SELECT COUNT(*) FROM torneo_equipos te
                      WHERE te.id_torneo = t.id_torneo AND te.estado_inscripcion = "Aceptada") AS inscriptos
               FROM torneos t
               JOIN disciplinas d ON d.id_disciplina = t.id_disciplina
               JOIN usuarios u    ON u.id_usuario    = t.id_organizador
               LEFT JOIN equipos e ON e.id_equipo    = t.id_campeon
              WHERE t.id_torneo = ?',
            [$idTorneo]
        );
    }

    /**
     * Consulta pública: solo torneos APROBADOS (los formales pendientes no se ven).
     * Filtros opcionales: texto, disciplina, formato, modalidad, estado.
     */
    public function listarPublicos(array $f): array {
        $where = ["estado_aprobacion = 'Aprobado'"];
        $params = [];

        if (!empty($f['q'])) {
            $where[] = '(nombre LIKE ? OR disciplina LIKE ? OR organizador LIKE ?)';
            $like = '%' . $f['q'] . '%';
            array_push($params, $like, $like, $like);
        }
        foreach (['id_disciplina', 'formato', 'modalidad', 'estado_torneo', 'tipo'] as $campo) {
            if (!empty($f[$campo])) {
                $where[] = "$campo = ?";
                $params[] = $f[$campo];
            }
        }
        $limite = min(100, max(1, (int)($f['limite'] ?? 60)));

        return $this->todos(
            'SELECT * FROM v_torneos_publicos WHERE ' . implode(' AND ', $where) .
            " ORDER BY FIELD(estado_torneo, 'En Proceso', 'Borrador', 'Finalizado'), creado_en DESC LIMIT $limite",
            $params
        );
    }

    /** Torneos que organiza un usuario (todos los estados). */
    public function organizadosPor(int $idUsuario): array {
        return $this->todos(
            'SELECT * FROM v_torneos_publicos WHERE id_organizador = ? ORDER BY creado_en DESC', [$idUsuario]);
    }

    /** Torneos donde participa un usuario (por ser miembro de un equipo inscripto). */
    public function participadosPor(int $idUsuario): array {
        return $this->todos(
            'SELECT DISTINCT v.*, e.nombre AS equipo, te.estado_inscripcion
               FROM v_torneos_publicos v
               JOIN torneo_equipos te  ON te.id_torneo = v.id_torneo
               JOIN equipo_miembros em ON em.id_equipo = te.id_equipo
               JOIN equipos e          ON e.id_equipo  = te.id_equipo
              WHERE em.id_usuario = ?
              ORDER BY v.creado_en DESC',
            [$idUsuario]
        );
    }

    public function esOrganizador(int $idTorneo, int $idUsuario): bool {
        return $this->uno('SELECT 1 FROM torneos WHERE id_torneo = ? AND id_organizador = ?', [$idTorneo, $idUsuario]) !== false;
    }

    public function cambiarEstado(int $idTorneo, string $estado, ?int $idCampeon = null): void {
        $this->ejecutar('UPDATE torneos SET estado_torneo = ?, id_campeon = ? WHERE id_torneo = ?',
            [$estado, $idCampeon, $idTorneo]);
    }

    // ------------------------------------------------------------------
    // Aprobación (solo admin, solo torneos formales)
    // ------------------------------------------------------------------

    /** Un torneo formal rechazado que el organizador corrigió vuelve a revisión. */
    public function reenviarAAprobacion(int $idTorneo): void {
        $this->ejecutar("UPDATE torneos SET estado_aprobacion = 'Pendiente', id_aprobador = NULL,
                                            fecha_aprobacion = NULL, motivo_rechazo = NULL
                          WHERE id_torneo = ? AND tipo = 'Formal'", [$idTorneo]);
    }

    public function pendientes(): array {
        return $this->todos(
            "SELECT * FROM v_torneos_publicos WHERE tipo = 'Formal' AND estado_aprobacion = 'Pendiente' ORDER BY creado_en");
    }

    public function resolverAprobacion(int $idTorneo, bool $aprobado, int $idAdmin, ?string $motivo): void {
        $this->ejecutar(
            'UPDATE torneos SET estado_aprobacion = ?, id_aprobador = ?, fecha_aprobacion = NOW(), motivo_rechazo = ?
              WHERE id_torneo = ?',
            [$aprobado ? 'Aprobado' : 'Rechazado', $idAdmin, $aprobado ? null : $motivo, $idTorneo]
        );
    }

    public function listarTodos(string $busqueda = ''): array {
        return $this->todos(
            'SELECT * FROM v_torneos_publicos WHERE nombre LIKE ? ORDER BY creado_en DESC LIMIT 200',
            ['%' . $busqueda . '%']);
    }
}
