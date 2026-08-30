<?php
// api/crear_torneo.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/conexion.php';

// Leer los datos que vienen desde el Frontend (React)
$datos = json_decode(file_get_contents("php://input"), true);

if (!empty($datos['nombre']) && !empty($datos['formato'])) {
    try {
        $db = Conexion::getConexion();
        
        // Consulta preparada para evitar Inyección SQL
        $sql = "INSERT INTO torneos (id_organizador, nombre, formato, tipo, max_equipos, estado_aprobacion, estado_torneo) 
                VALUES (:organizador, :nombre, :formato, :tipo, :max_equipos, 'Aprobado', 'Borrador')";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':organizador' => $datos['id_organizador'] ?? 1, // ID de prueba
            ':nombre'      => $datos['nombre'],
            ':formato'     => $datos['formato'],
            ':tipo'        => $datos['tipo'] ?? 'Amateur',
            ':max_equipos' => $datos['max_equipos'] ?? 16
        ]);

        echo json_encode(["status" => "success", "message" => "¡Torneo creado con éxito desde la app!"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error en BD: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Faltan datos obligatorios"]);
}