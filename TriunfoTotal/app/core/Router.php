<?php
// app/core/Router.php
//
// Router mínimo: asocia "MÉTODO + ruta" con "Controlador@método".
// Las partes {id} de la ruta se pasan como parámetros enteros al método.
//
//   $router->get('torneos/{id}', [TorneoController::class, 'detalle']);
//   GET /api/torneos/7  ->  (new TorneoController)->detalle(7)

class Router {
    private array $rutas = [];

    public function get(string $ruta, array $accion): void    { $this->agregar('GET', $ruta, $accion); }
    public function post(string $ruta, array $accion): void   { $this->agregar('POST', $ruta, $accion); }
    public function put(string $ruta, array $accion): void    { $this->agregar('PUT', $ruta, $accion); }
    public function delete(string $ruta, array $accion): void { $this->agregar('DELETE', $ruta, $accion); }

    private function agregar(string $metodo, string $ruta, array $accion): void {
        // 'torneos/{id}/rondas' -> regex '#^torneos/(\d+)/rondas$#'
        $regex = '#^' . preg_replace('#\{[a-z_]+\}#', '(\d+)', trim($ruta, '/')) . '$#';
        $this->rutas[] = [$metodo, $regex, $accion];
    }

    public function despachar(string $metodo, string $ruta): void {
        $ruta = trim($ruta, '/');
        $rutaExiste = false;

        foreach ($this->rutas as [$m, $regex, $accion]) {
            if (!preg_match($regex, $ruta, $coincidencias)) {
                continue;
            }
            $rutaExiste = true;
            if ($m !== $metodo) {
                continue;
            }
            array_shift($coincidencias);
            $parametros = array_map('intval', $coincidencias);

            [$clase, $metodoControlador] = $accion;
            (new $clase())->$metodoControlador(...$parametros);
            return;
        }

        throw $rutaExiste
            ? new HttpError(405, 'Método no permitido para esta ruta')
            : new HttpError(404, 'Ruta no encontrada: ' . $ruta);
    }
}
