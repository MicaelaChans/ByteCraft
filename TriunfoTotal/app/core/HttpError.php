<?php
// app/core/HttpError.php
//
// Excepción "de negocio": cualquier controlador o modelo puede hacer
//   throw new HttpError(403, 'No sos el organizador de este torneo');
// y el manejador central (App.php) la convierte en una respuesta JSON
// con ese código HTTP. Así no repetimos http_response_code + echo + exit
// en todos lados (manejo centralizado de errores).

class HttpError extends Exception {
    private array $detalles;

    public function __construct(int $codigoHttp, string $mensaje, array $detalles = []) {
        parent::__construct($mensaje, $codigoHttp);
        $this->detalles = $detalles;
    }

    public function getDetalles(): array {
        return $this->detalles;
    }
}
