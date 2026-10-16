<?php
// app/modulos/ModuloCompetencia.php
//
// "Módulo de competencia" = una forma de organizar enfrentamientos.
// Todos los módulos (Liga, Eliminación, Suizo) cumplen este mismo contrato,
// así el TorneoController no necesita saber cómo funciona cada uno
// (bajo acoplamiento: se puede agregar un módulo nuevo sin tocar el resto).
//
// Ciclo de vida:
//   1) iniciar()        -> se llama al empezar el torneo: crea la 1ª ronda (o todas, en liga)
//   2) el organizador carga resultados y CIERRA la ronda
//   3) siguientePaso()  -> crea la ronda siguiente o finaliza el torneo con su campeón

abstract class ModuloCompetencia {
    protected Ronda $rondas;
    protected Partido $partidos;
    protected Posicion $posiciones;

    public function __construct() {
        $this->rondas = new Ronda();
        $this->partidos = new Partido();
        $this->posiciones = new Posicion();
    }

    /** Mínimo de participantes aceptados para poder iniciar. */
    public function minimoParticipantes(): int {
        return 2;
    }

    /** ¿Este formato admite empates? (en eliminación directa no). */
    public function permiteEmpates(): bool {
        return true;
    }

    /** Crea la(s) primera(s) ronda(s). $equipos = ids de equipos aceptados. */
    abstract public function iniciar(array $torneo, array $equipos): void;

    /**
     * Se llama cuando el organizador cierra una ronda.
     * Devuelve ['finalizado' => bool, 'id_campeon' => ?int, 'mensaje' => string]
     */
    abstract public function siguientePaso(array $torneo): array;

    /** Fábrica: devuelve el módulo según el formato del torneo. */
    public static function para(string $formato): ModuloCompetencia {
        return match ($formato) {
            'Liga'        => new ModuloLiga(),
            'Eliminacion' => new ModuloEliminacion(),
            'Suizo'       => new ModuloSuizo(),
            default       => throw new HttpError(400, "Formato de torneo desconocido: $formato"),
        };
    }

    /** Campeón = primero de la tabla de posiciones. */
    protected function lider(int $idTorneo): ?int {
        $tabla = $this->posiciones->tabla($idTorneo);
        return $tabla ? (int)$tabla[0]['id_equipo'] : null;
    }

    protected function finalizado(?int $idCampeon, string $mensaje): array {
        return ['finalizado' => true, 'id_campeon' => $idCampeon, 'mensaje' => $mensaje];
    }

    protected function continua(string $mensaje): array {
        return ['finalizado' => false, 'id_campeon' => null, 'mensaje' => $mensaje];
    }
}
