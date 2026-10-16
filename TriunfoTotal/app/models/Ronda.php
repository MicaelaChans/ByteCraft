<?php
// app/models/Ronda.php
//
// MODELO de rondas (jornadas de liga, fases de eliminación, rondas suizas).

class Ronda extends Modelo {

    public function crear(int $idTorneo, int $numero, string $nombre): int {
        $this->ejecutar("INSERT INTO rondas (id_torneo, numero, nombre, estado) VALUES (?, ?, ?, 'Abierta')",
            [$idTorneo, $numero, $nombre]);
        return (int)$this->db->lastInsertId();
    }

    public function buscar(int $idRonda): array|false {
        return $this->uno('SELECT * FROM rondas WHERE id_ronda = ?', [$idRonda]);
    }

    public function deTorneo(int $idTorneo): array {
        return $this->todos('SELECT * FROM rondas WHERE id_torneo = ? ORDER BY numero', [$idTorneo]);
    }

    public function ultima(int $idTorneo): array|false {
        return $this->uno('SELECT * FROM rondas WHERE id_torneo = ? ORDER BY numero DESC LIMIT 1', [$idTorneo]);
    }

    public function cantidad(int $idTorneo): int {
        return (int)$this->valor('SELECT COUNT(*) FROM rondas WHERE id_torneo = ?', [$idTorneo]);
    }

    public function cerrar(int $idRonda): void {
        $this->ejecutar("UPDATE rondas SET estado = 'Cerrada', fecha_cierre = NOW() WHERE id_ronda = ?", [$idRonda]);
    }

    public function reabrir(int $idRonda): void {
        $this->ejecutar("UPDATE rondas SET estado = 'Abierta', fecha_cierre = NULL WHERE id_ronda = ?", [$idRonda]);
    }

    public function hayAbiertas(int $idTorneo): bool {
        return $this->uno("SELECT 1 FROM rondas WHERE id_torneo = ? AND estado <> 'Cerrada' LIMIT 1", [$idTorneo]) !== false;
    }
}
