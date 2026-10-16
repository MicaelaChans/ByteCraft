<?php
// app/models/Catalogo.php
//
// MODELO de catálogos del sistema: disciplinas y módulos de competencia.

class Catalogo extends Modelo {

    public function disciplinas(): array {
        return $this->todos('SELECT * FROM disciplinas ORDER BY nombre');
    }

    public function existeDisciplina(int $id): bool {
        return $this->uno('SELECT 1 FROM disciplinas WHERE id_disciplina = ?', [$id]) !== false;
    }

    public function modulos(): array {
        return $this->todos('SELECT * FROM modulos ORDER BY FIELD(codigo, "Liga", "Eliminacion", "Suizo")');
    }

    public function moduloHabilitado(string $codigo): bool {
        return (bool)$this->valor('SELECT habilitado FROM modulos WHERE codigo = ?', [$codigo]);
    }

    public function cambiarModulo(string $codigo, bool $habilitado): void {
        $this->ejecutar('UPDATE modulos SET habilitado = ? WHERE codigo = ?', [$habilitado ? 1 : 0, $codigo]);
    }

    /** Números generales para el panel del admin (reportes). */
    public function estadisticas(): array {
        $uno = fn(string $sql) => (int)$this->valor($sql);
        return [
            'usuarios'           => $uno('SELECT COUNT(*) FROM usuarios'),
            'usuarios_baneados'  => $uno("SELECT COUNT(*) FROM usuarios WHERE estado = 'Baneado'"),
            'equipos'            => $uno('SELECT COUNT(*) FROM equipos WHERE es_individual = 0'),
            'torneos'            => $uno('SELECT COUNT(*) FROM torneos'),
            'torneos_en_proceso' => $uno("SELECT COUNT(*) FROM torneos WHERE estado_torneo = 'En Proceso'"),
            'torneos_pendientes' => $uno("SELECT COUNT(*) FROM torneos WHERE estado_aprobacion = 'Pendiente'"),
            'partidos_jugados'   => $uno("SELECT COUNT(*) FROM partidos WHERE estado = 'Finalizado' AND id_equipo_visita IS NOT NULL"),
            'logins_fallidos_24h'=> $uno('SELECT COUNT(*) FROM intentos_login WHERE exito = 0 AND creado_en > NOW() - INTERVAL 1 DAY'),
            'por_formato'        => $this->todos('SELECT formato, COUNT(*) AS cantidad FROM torneos GROUP BY formato'),
            'por_disciplina'     => $this->todos('SELECT d.nombre, COUNT(t.id_torneo) AS cantidad FROM disciplinas d
                                                   LEFT JOIN torneos t ON t.id_disciplina = d.id_disciplina
                                                   GROUP BY d.id_disciplina ORDER BY cantidad DESC'),
        ];
    }
}
