<?php
// app/models/Posicion.php
//
// MODELO de la tabla de posiciones. Los números los calcula la base
// (procedimiento sp_recalcular_posiciones), acá solo se leen ordenados.
// Criterio de desempate: puntos > diferencia de goles > goles a favor.

class Posicion extends Modelo {

    public function tabla(int $idTorneo): array {
        $filas = $this->todos(
            'SELECT * FROM v_posiciones WHERE id_torneo = ?
              ORDER BY puntos DESC, diferencia_goles DESC, goles_favor DESC, equipo', [$idTorneo]);
        foreach ($filas as $i => &$f) {
            $f['posicion'] = $i + 1;
        }
        return $filas;
    }

    /** Puntos actuales por equipo: [id_equipo => puntos] (lo usa el suizo). */
    public function puntosPorEquipo(int $idTorneo): array {
        $res = [];
        foreach ($this->tabla($idTorneo) as $f) {
            $res[(int)$f['id_equipo']] = (int)$f['puntos'];
        }
        return $res;
    }

    public function recalcular(int $idTorneo): void {
        $this->ejecutar('CALL sp_recalcular_posiciones(?)', [$idTorneo]);
    }
}
