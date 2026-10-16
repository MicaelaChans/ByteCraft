<?php
// app/modulos/ModuloEliminacion.php
//
// ELIMINACIÓN DIRECTA (llaves). El que pierde queda afuera.
//
//   - La llave necesita una potencia de 2 (2, 4, 8, 16...). Si hay, por
//     ejemplo, 6 equipos, la llave es de 8 y 2 equipos reciben BYE
//     (pasan directo a la ronda siguiente sin jugar).
//   - Cada ronda nueva se arma con los ganadores de la anterior, en orden:
//     ganador del partido 1 vs ganador del 2, el 3 vs el 4, etc.
//   - No se permiten empates: el organizador tiene que cargar un ganador
//     (si hubo penales, se carga el resultado incluyendo la definición).

class ModuloEliminacion extends ModuloCompetencia {

    public function permiteEmpates(): bool {
        return false;
    }

    public function iniciar(array $torneo, array $equipos): void {
        $idTorneo = (int)$torneo['id_torneo'];
        shuffle($equipos); // sorteo de la llave

        $tamLlave = 1;
        while ($tamLlave < count($equipos)) {
            $tamLlave *= 2;
        }
        $byes = $tamLlave - count($equipos);

        $idRonda = $this->rondas->crear($idTorneo, 1, self::nombreRonda($tamLlave));

        // Los primeros $byes equipos pasan directo; el resto juega de a pares
        $i = 0;
        for (; $i < $byes; $i++) {
            $this->partidos->crear($idTorneo, $idRonda, $equipos[$i], null);
        }
        for (; $i < count($equipos); $i += 2) {
            $this->partidos->crear($idTorneo, $idRonda, $equipos[$i], $equipos[$i + 1]);
        }
    }

    public function siguientePaso(array $torneo): array {
        $idTorneo = (int)$torneo['id_torneo'];
        $ultima = $this->rondas->ultima($idTorneo);

        $ganadores = [];
        foreach ($this->partidos->deRonda((int)$ultima['id_ronda']) as $p) {
            $ganadores[] = Partido::ganador($p);
        }

        if (count($ganadores) === 1) {
            return $this->finalizado($ganadores[0], 'Se jugó la final: ¡tenemos campeón!');
        }

        $numero = (int)$ultima['numero'] + 1;
        $idRonda = $this->rondas->crear($idTorneo, $numero, self::nombreRonda(count($ganadores)));
        for ($i = 0; $i < count($ganadores); $i += 2) {
            $this->partidos->crear($idTorneo, $idRonda, $ganadores[$i], $ganadores[$i + 1]);
        }
        return $this->continua('Se generó la ronda: ' . self::nombreRonda(count($ganadores)) . '.');
    }

    /** Nombre de la ronda según cuántos equipos quedan. */
    public static function nombreRonda(int $equiposEnRonda): string {
        return match ($equiposEnRonda) {
            2  => 'Final',
            4  => 'Semifinal',
            8  => 'Cuartos de final',
            16 => 'Octavos de final',
            32 => 'Dieciseisavos de final',
            default => "Ronda de $equiposEnRonda",
        };
    }
}
