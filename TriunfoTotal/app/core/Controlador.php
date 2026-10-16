<?php
// app/core/Controlador.php
//
// Clase base de todos los controladores. Un controlador:
//   1) recibe la petición, 2) valida datos y permisos,
//   3) le pide al MODELO que haga el trabajo, 4) responde JSON.
// Nunca escribe SQL (eso es responsabilidad del modelo).

abstract class Controlador {

    /** Lee el cuerpo JSON de la petición. */
    protected function cuerpo(): array {
        $crudo = file_get_contents('php://input');
        if ($crudo === '' || $crudo === false) {
            return [];
        }
        $datos = json_decode($crudo, true);
        if (!is_array($datos)) {
            throw new HttpError(400, 'El cuerpo de la petición no es un JSON válido.');
        }
        return $datos;
    }

    /** Parámetro de la query string (?q=...&formato=...) */
    protected function query(string $clave, ?string $porDefecto = null): ?string {
        $v = $_GET[$clave] ?? $porDefecto;
        return is_string($v) ? trim($v) : $porDefecto;
    }

    protected function ok($data = null, int $codigo = 200): void {
        Respuesta::json($data, $codigo);
    }
}
