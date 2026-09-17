<?php
// api/Crear_Torneo.php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Ojo con el nombre exacto de tus archivos creados
require_once __DIR__ . '/../config/Conexion.php';
require_once __DIR__ . '/../config/Permisos.php';

// 1. Validar autenticación de sesión
if (!isset($_SESSION['id_usuario'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Debes iniciar sesión para crear un torneo.']);
    exit;
}

try {
    $db = Conexion::getConexion();
    $datos = json_decode(file_get_contents('php://input'), true);

    // 2. Extraer parámetros enviados desde el Frontend
    $nombre        = trim($datos['nombre'] ?? '');
    $deporte       = trim($datos['deporte'] ?? 'Fútbol');
    $descripcion   = trim($datos['descripcion'] ?? '');
    $formato       = $datos['formato'] ?? 'Liga';       // 'Liga', 'Eliminacion', 'Suizo'
    $tipo          = $datos['tipo'] ?? 'Informal';      // 'Informal', 'Formal'
    $maxEquipos    = (int)($datos['max_equipos'] ?? 16);
    $idOrganizador = $_SESSION['id_usuario'];           // Extraído de la sesión por seguridad

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre del torneo es obligatorio.']);
        exit;
    }

    // 3. Regla de Negocio: Informal -> Aprobado directo / Formal -> Pendiente para Admin
    $estadoAprobacion = ($tipo === 'Formal') ? 'Pendiente' : 'Aprobado';

    $sql = "INSERT INTO torneos 
            (id_organizador, nombre, deporte, descripcion, formato, tipo, max_equipos, estado_aprobacion, estado_torneo) 
            VALUES 
            (:id_organizador, :nombre, :deporte, :descripcion, :formato, :tipo, :max_equipos, :estado_aprobacion, 'Borrador')";

    $stmt = $db->prepare($sql);
    $ok = $stmt->execute([
        ':id_organizador'   => $idOrganizador,
        ':nombre'           => $nombre,
        ':deporte'          => $deporte,
        ':descripcion'      => $descripcion,
        ':formato'          => $formato,
        ':tipo'             => $tipo,
        ':max_equipos'      => $maxEquipos,
        ':estado_aprobacion'=> $estadoAprobacion
    ]);

    if ($ok) {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id_torneo' => $db->lastInsertId(),
            'estado_aprobacion' => $estadoAprobacion,
            'mensaje' => ($tipo === 'Formal') 
                ? 'Torneo registrado con éxito. Pendiente de aprobación por el Administrador.' 
                : 'Torneo Informal creado y aprobado automáticamente.'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo registrar el torneo.']);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}