<?php



// 1. Enviar encabezados CORS siempre, sin importar qué suceda después
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Responder inmediatamente al preflight OPTIONS de React
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Habilitar la visualización de errores PHP
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    // Intentamos cargar la clase del usuario
    require_once __DIR__ . '/usuario.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        exit;
    }

    $datos = json_decode(file_get_contents('php://input'), true);

    $nombre   = trim($datos['nombre']   ?? '');
    $apellido = trim($datos['apellido'] ?? '');
    $email    = trim($datos['email']    ?? '');
    $password = $datos['password']      ?? '';

    if (empty($nombre) || empty($apellido) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Todos los campos son obligatorios']);
        exit;
    }

    $usuarioModel = new Usuario();

    if ($usuarioModel->buscarPorEmail($email)) {
        http_response_code(409);
        echo json_encode(['error' => 'Ese email ya está registrado']);
        exit;
    }

    $id = $usuarioModel->registrar($nombre, $email, $password);

    if ($id) {
        $usuarioModel->actualizarPerfil($id, ['apellido' => $apellido]);
        http_response_code(201);
        echo json_encode(['success' => true, 'id_usuario' => $id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo guardar el usuario en la base de datos']);
    }

} catch (Throwable $e) {
    // Si algo falla en PHP o PDO, capturamos el choque y devolvemos la falla en formato JSON limpia
    http_response_code(200);
    echo json_encode([
        'error_fatal_php' => $e->getMessage(),
        'archivo' => $e->getFile(),
        'linea' => $e->getLine()
    ]);
}