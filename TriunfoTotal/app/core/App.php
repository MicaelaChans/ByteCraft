<?php
// app/core/App.php
//
// "Arranque" de la API. Lo llama api/index.php (el front controller).
// Acá se centraliza todo lo que es común a TODAS las peticiones:
//   - carga automática de clases (autoload)
//   - cabeceras de seguridad y CORS
//   - sesión + contexto de auditoría
//   - manejo centralizado de errores (nunca se muestra un error interno al usuario)

define('APP_DIR', dirname(__DIR__));            // .../app
define('RAIZ_DIR', dirname(APP_DIR));           // raíz del proyecto

require_once RAIZ_DIR . '/config/Conexion.php';

// Autoload: "TorneoController" -> app/controllers/TorneoController.php, etc.
spl_autoload_register(function (string $clase) {
    foreach (['core', 'controllers', 'models', 'modulos'] as $carpeta) {
        $archivo = APP_DIR . "/$carpeta/$clase.php";
        if (file_exists($archivo)) {
            require_once $archivo;
            return;
        }
    }
});

class App {

    public static function ejecutar(): void {
        // Los errores se registran en el log del servidor, NO se muestran
        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        error_reporting(E_ALL);

        self::cabeceras();

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204); // respuesta al "preflight" de CORS
            return;
        }

        try {
            self::controlarOrigen();
            Sesion::iniciar();
            // Contexto para los triggers de auditoría (quién y desde qué IP)
            Conexion::setContextoAuditoria(Sesion::idUsuario(), Sesion::ip());

            $router = new Router();
            require APP_DIR . '/rutas.php';
            $router->despachar($_SERVER['REQUEST_METHOD'], self::rutaPedida());

        } catch (HttpError $e) {
            Respuesta::error($e->getMessage(), $e->getCode(), $e->getDetalles());

        } catch (PDOException $e) {
            error_log('[TriunfoTotal][BD] ' . $e->getMessage());
            // Errores que tiran los triggers con SIGNAL (reglas de negocio en la base)
            if ($e->getCode() === '45000') {
                Respuesta::error(self::mensajeSignal($e->getMessage()), 409);
            } elseif ($e->getCode() === '23000') {
                Respuesta::error('El dato ya existe o está siendo usado por otro registro.', 409);
            } else {
                Respuesta::error('Error interno de base de datos. Intentá más tarde.', 500);
            }

        } catch (Throwable $e) {
            error_log('[TriunfoTotal] ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
            Respuesta::error('Ocurrió un error inesperado. Intentá más tarde.', 500);
        }
    }

    /** Ruta pedida: /api/torneos/5 -> "torneos/5" (con o sin mod_rewrite). */
    private static function rutaPedida(): string {
        if (!empty($_GET['ruta'])) {
            return (string)$_GET['ruta'];
        }
        if (!empty($_SERVER['PATH_INFO'])) {
            return $_SERVER['PATH_INFO'];
        }
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        return preg_replace('#^.*?/api(/index\.php)?#', '', $path);
    }

    private static function cabeceras(): void {
        header('Content-Type: application/json; charset=UTF-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        header('Cache-Control: no-store');

        // CORS: solo se permiten los orígenes de la lista (por defecto el Vite de desarrollo)
        $permitidos = array_map('trim', explode(',', getenv('CORS_ORIGENES') ?: 'http://localhost:5173'));
        $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origen !== '' && in_array($origen, $permitidos, true)) {
            header("Access-Control-Allow-Origin: $origen");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
            header('Vary: Origin');
        }
    }

    /**
     * Protección CSRF: las peticiones que MODIFICAN datos deben:
     *  - venir del mismo sitio (o de un origen permitido), y
     *  - ser JSON (un formulario HTML de otro sitio no puede mandar JSON sin CORS).
     */
    private static function controlarOrigen(): void {
        if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
            return;
        }
        $tipo = $_SERVER['CONTENT_TYPE'] ?? '';
        $largo = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($largo > 0 && stripos($tipo, 'application/json') !== 0) {
            throw new HttpError(415, 'La API solo acepta JSON.');
        }
        $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origen !== '') {
            $host = parse_url($origen, PHP_URL_HOST) . (parse_url($origen, PHP_URL_PORT) ? ':' . parse_url($origen, PHP_URL_PORT) : '');
            $permitidos = array_map('trim', explode(',', getenv('CORS_ORIGENES') ?: 'http://localhost:5173'));
            if ($host !== ($_SERVER['HTTP_HOST'] ?? '') && !in_array($origen, $permitidos, true)) {
                throw new HttpError(403, 'Origen no permitido.');
            }
        }
    }

    private static function mensajeSignal(string $mensaje): string {
        // "SQLSTATE[45000]: <<Unknown error>>: 1644 El módulo..." -> "El módulo..."
        return preg_replace('/^.*?1644\s*/', '', $mensaje);
    }
}
