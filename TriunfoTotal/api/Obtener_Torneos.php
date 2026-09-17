<?php
// Configuración de cabeceras para permitir peticiones desde React (CORS) y responder en JSON
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/conexion.php';

try {
    // 1. Obtener la conexión PDO
    $db = Conexion::getConexion();

    // 2. Consulta con JOIN para traer el nombre del torneo y el nombre de su organizador
    $sql = "SELECT t.id_torneo, t.nombre AS torneo_nombre, t.formato, t.tipo, 
                   t.estado_torneo, u.nombre AS organizador_nombre
            FROM torneos t
            INNER JOIN usuarios u ON t.id_organizador = u.id_usuario";

    $stmt = $db->prepare($sql);
    $stmt->execute();

    // 3. Obtener todos los registros en un array asociativo
    $torneos = $stmt->fetchAll();

    // 4. Responder a React con el JSON de los torneos
    echo json_encode([
        "status" => "success",
        "data" => $torneos
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error al consultar los torneos: " . $e->getMessage()
    ]);
}