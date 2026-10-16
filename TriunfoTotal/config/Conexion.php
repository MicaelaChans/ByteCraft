<?php
// config/Conexion.php
//
// Conexión única (Singleton) a MariaDB/MySQL usando PDO.
// Las credenciales NO están acá (este archivo se sube a git):
//   1) En Docker vienen de variables de entorno (DB_HOST, DB_NAME, ...).
//   2) En una instalación local vienen de config/config.local.php (ignorado por git).

$configLocal = __DIR__ . '/config.local.php';
if (file_exists($configLocal)) {
    require_once $configLocal;
}

function configDb(string $clave, string $porDefecto): string {
    $env = getenv($clave);
    if ($env !== false && $env !== '') {
        return $env;
    }
    return defined($clave) ? constant($clave) : $porDefecto;
}

class Conexion {
    private static ?PDO $pdo = null;

    private function __construct() {}

    // Patrón Singleton: una sola conexión por petición HTTP
    public static function getConexion(): PDO {
        if (self::$pdo === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                configDb('DB_HOST', 'localhost'),
                configDb('DB_PORT', '3306'),
                configDb('DB_NAME', 'triunfo_total_db')
            );

            self::$pdo = new PDO($dsn, configDb('DB_USER', ''), configDb('DB_PASS', ''), [
                // Lanza excepciones ante errores (las atrapa el manejador central)
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                // Devuelve arrays asociativos
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Consultas preparadas nativas: previene SQL Injection
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }
        return self::$pdo;
    }

    /**
     * Le dice a la base quién está operando y desde qué IP.
     * Los triggers de auditoría leen @app_id_usuario y @app_ip.
     */
    public static function setContextoAuditoria(?int $idUsuario, string $ip): void {
        $stmt = self::getConexion()->prepare('SET @app_id_usuario = ?, @app_ip = ?');
        $stmt->execute([$idUsuario, $ip]);
    }
}
