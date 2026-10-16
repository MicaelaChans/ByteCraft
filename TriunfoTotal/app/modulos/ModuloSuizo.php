<?php
// app/modulos/ModuloSuizo.php
//
// SISTEMA SUIZO (típico del ajedrez). Nadie queda eliminado:
//
//   - Se juega una cantidad fija de rondas: ceil(log2(n)) por defecto
//     (con 8 jugadores, 3 rondas; con 16, 4), o la que elija el organizador.
//   - Ronda 1: emparejamiento por sorteo.
//   - Rondas siguientes: se ordena por puntos y se empareja a cada uno con
//     el rival más cercano en la tabla CON EL QUE TODAVÍA NO JUGÓ
//     (se usa "backtracking": si un emparejamiento deja a alguien sin rival
//     válido, se deshace y se prueba el siguiente candidato).
//   - Si son impares, el último de la tabla que todavía no tuvo BYE
//     descansa y suma una victoria.
//   - Gana quien tenga más puntos al terminar la última ronda.

class ModuloSuizo extends ModuloCompetencia {

    public function minimoParticipantes(): int {
        return 3;
    }

    public static function totalRondas(array $torneo, int $cantidadEquipos): int {
        $porDefecto = (int)ceil(log($cantidadEquipos, 2));
        $elegidas = (int)($torneo['rondas_suizo'] ?? 0);
        $rondas = $elegidas > 0 ? $elegidas : $porDefecto;
        // Más de n-1 rondas obligaría a repetir rivales
        return max(1, min($rondas, $cantidadEquipos - 1));
    }

    public function iniciar(array $torneo, array $equipos): void {
        shuffle($equipos);
        $this->crearRonda($torneo, 1, $equipos);
    }

    public function siguientePaso(array $torneo): array {
        $idTorneo = (int)$torneo['id_torneo'];
        $equipos = (new Inscripcion())->aceptados($idTorneo);
        $jugadas = $this->rondas->cantidad($idTorneo);
        $total = self::totalRondas($torneo, count($equipos));

        if ($jugadas >= $total) {
            return $this->finalizado($this->lider($idTorneo), "Se jugaron las $total rondas del suizo.");
        }

        // Orden por puntos (los empatados en puntos se mezclan al azar)
        $puntos = $this->posiciones->puntosPorEquipo($idTorneo);
        shuffle($equipos);
        usort($equipos, fn($a, $b) => ($puntos[$b] ?? 0) <=> ($puntos[$a] ?? 0));

        $this->crearRonda($torneo, $jugadas + 1, $equipos);
        return $this->continua('Se generó la ronda suiza ' . ($jugadas + 1) . " de $total.");
    }

    /** $ordenados: equipos ya ordenados (por puntos o sorteados). */
    private function crearRonda(array $torneo, int $numero, array $ordenados): void {
        $idTorneo = (int)$torneo['id_torneo'];
        $bye = null;

        if (count($ordenados) % 2 === 1) {
            $yaTuvieron = $this->partidos->equiposConBye($idTorneo);
            // El de más abajo en la tabla que todavía no descansó
            for ($i = count($ordenados) - 1; $i >= 0; $i--) {
                if (!in_array($ordenados[$i], $yaTuvieron, true)) {
                    $bye = $ordenados[$i];
                    break;
                }
            }
            $bye ??= end($ordenados);
            $ordenados = array_values(array_filter($ordenados, fn($e) => $e !== $bye));
        }

        $jugados = $this->partidos->paresJugados($idTorneo);
        $pares = self::emparejar($ordenados, $jugados)
              ?? array_chunk($ordenados, 2); // sin solución perfecta: se permite repetir

        $idRonda = $this->rondas->crear($idTorneo, $numero, "Ronda suiza $numero");
        foreach ($pares as [$a, $b]) {
            $this->partidos->crear($idTorneo, $idRonda, $a, $b);
        }
        if ($bye !== null) {
            $this->partidos->crear($idTorneo, $idRonda, $bye, null);
        }
    }

    /**
     * Empareja de arriba hacia abajo evitando rivales repetidos (backtracking).
     * Devuelve la lista de pares o null si no hay forma sin repetir.
     */
    public static function emparejar(array $equipos, array $jugados): ?array {
        if (count($equipos) === 0) {
            return [];
        }
        $primero = array_shift($equipos);
        foreach ($equipos as $i => $candidato) {
            $clave = min($primero, $candidato) . '-' . max($primero, $candidato);
            if (isset($jugados[$clave])) {
                continue;
            }
            $resto = $equipos;
            unset($resto[$i]);
            $sub = self::emparejar(array_values($resto), $jugados);
            if ($sub !== null) {
                return array_merge([[$primero, $candidato]], $sub);
            }
        }
        return null;
    }
}
