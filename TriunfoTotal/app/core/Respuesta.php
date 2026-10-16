<?php
// app/core/Respuesta.php
//
// Todas las respuestas de la API salen por acá, siempre en JSON:
//   éxito -> { "ok": true,  "data": ... }
//   error -> { "ok": false, "error": "mensaje", "detalles": {...} }

class Respuesta {
    public static function json($data, int $codigo = 200): void {
        http_response_code($codigo);
        echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    }

    public static function error(string $mensaje, int $codigo = 400, array $detalles = []): void {
        http_response_code($codigo);
        $cuerpo = ['ok' => false, 'error' => $mensaje];
        if ($detalles) {
            $cuerpo['detalles'] = $detalles;
        }
        echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    }
}
