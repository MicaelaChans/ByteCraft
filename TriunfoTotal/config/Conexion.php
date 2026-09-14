<?php
// config/conexion.php

define('DB_HOST', 'localhost');
define('DB_NAME', 'triunfo_total_db');
define('DB_USER', 'app_triunfototal'); // Usuario DCL que creaste para la aplicación
define('DB_PASS', 'TriunfoApp2026!');  // Contraseña asignada al usuario DCL
define('DB_CHARSET', 'utf8mb4');

class Conexion {
    private static $instancia = null;
    private $pdo;

    private function __construct() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        
        $opciones = [
            // Lanza excepciones en caso de error para capturarlas
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            // Retorna los registros como arrays asociativos por defecto
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Desactiva la emulación para usar consultas preparadas nativas (Previene SQL Injection)
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $opciones);
        } catch (PDOException $e) {
            die("Error crítico de conexión a la Base de Datos: " . $e->getMessage());
        }
    }

    // Patrón Singleton: evita abrir múltiples conexiones a la BD
    public static function getConexion() {
        if (self::$instancia === null) {
            self::$instancia = new Conexion();
        }
        return self::$instancia->pdo;
    }
}