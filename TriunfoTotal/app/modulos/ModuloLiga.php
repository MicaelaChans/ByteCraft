<?php
// app/modulos/ModuloLiga.php
//
// LIGA (todos contra todos). Se genera el fixture COMPLETO al iniciar,
// usando el "método del círculo" (round robin):
//
//   - Se ponen los equipos en dos filas. El primero queda fijo y el resto
//     "gira" una posición en cada jornada. Así cada equipo juega una vez
//     contra cada rival y nadie juega dos veces en la misma jornada.
//   - Si la cantidad es impar se agrega un "fantasma" (null): el que le
//     toca contra el fantasma descansa esa fecha (no se crea partido).
//   - Con ida y vuelta se repiten las jornadas invirtiendo local/visitante.
//
// n equipos -> n-1 jornadas (n par) o n jornadas (n impar).

class ModuloLiga extends ModuloCompetencia {

    public function iniciar(array $torneo, array $equipos): void {
        $idTorneo = (int)$torneo['id_torneo'];
        $jornadas = self::fixture($equipos, (bool)$torneo['ida_y_vuelta']);

        foreach ($jornadas as $i => $partidos) {
            $idRonda = $this->rondas->crear($idTorneo, $i + 1, 'Jornada ' . ($i + 1));
            foreach ($partidos as [$local, $visita]) {
                $this->partidos->crear($idTorneo, $idRonda, $local, $visita);
            }
        }
    }

    /**
     * Genera las jornadas. Función pura (no toca la base) para poder probarla sola.
     * @return array<int, array<int, array{0:int,1:int}>>
     */
    public static function fixture(array $equipos, bool $idaYVuelta): array {
        shuffle($equipos); // sorteo del orden
        if (count($equipos) % 2 === 1) {
            $equipos[] = null; // fantasma = fecha libre
        }
        $n = count($equipos);
        $jornadas = [];

        for ($ronda = 0; $ronda < $n - 1; $ronda++) {
            $partidos = [];
            for ($i = 0; $i < $n / 2; $i++) {
                $a = $equipos[$i];
                $b = $equipos[$n - 1 - $i];
                if ($a === null || $b === null) {
                    continue; // alguien descansa
                }
                // Alternamos localía para que no sea siempre el mismo local
                $partidos[] = ($ronda % 2 === 0) ? [$a, $b] : [$b, $a];
            }
            $jornadas[] = $partidos;

            // Rotación: el primero fijo, el último pasa a la posición 1
            $fijo = array_shift($equipos);
            array_unshift($equipos, array_pop($equipos));
            array_unshift($equipos, $fijo);
        }

        if ($idaYVuelta) {
            foreach ($jornadas as $partidos) {
                $jornadas[] = array_map(fn($p) => [$p[1], $p[0]], $partidos);
            }
        }
        return $jornadas;
    }

    public function siguientePaso(array $torneo): array {
        $idTorneo = (int)$torneo['id_torneo'];
        if ($this->rondas->hayAbiertas($idTorneo)) {
            return $this->continua('Jornada cerrada. Quedan jornadas por jugar.');
        }
        return $this->finalizado($this->lider($idTorneo), 'Se jugaron todas las jornadas: la liga terminó.');
    }
}
