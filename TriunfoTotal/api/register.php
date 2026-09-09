<?php
// api/registrar.php

require_once __DIR__ . '/usuario.php';

// --- CORS: React (Vite, puerto 5173) y PHP (Apache, puerto 80) son "orígenes" distintos ---
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// El navegador manda un OPTIONS "de prueba" antes del POST real. Solo respondemos OK.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$datos = json_decode(file_get_contents('php://input'), true);

// Validación en el backend (SIEMPRE, aunque React ya haya validado)
$nombre   = trim($datos['nombre']   ?? '');
$apellido = trim($datos['apellido'] ?? '');
$email    = trim($datos['email']    ?? '');
$password = $datos['password']      ?? '';

if ($nombre === '' || $apellido === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Todos los campos son obligatorios']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'El email no es válido']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'La contraseña debe tener al menos 6 caracteres']);
    exit;
}

$usuarioModel = new Usuario();

// Chequear que el email no esté usado
if ($usuarioModel->buscarPorEmail($email)) {
    http_response_code(409); // 409 = Conflict
    echo json_encode(['error' => 'Ese email ya está registrado']);
    exit;
}

// El nombre completo lo guardamos como "nombre" en la tabla usuarios;
// "apellido" ya es una columna aparte (agregada con el ALTER TABLE).
$nombreCompleto = $nombre; // usuarios.nombre
$id = $usuarioModel->registrar($nombreCompleto, $email, $password);

if ($id === false) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo registrar el usuario']);
    exit;
}

// Guardamos el apellido en un segundo paso (registrar() original solo inserta nombre/email/password)
$usuarioModel->actualizarPerfil($id, ['apellido' => $apellido, 'alias' => null, 'telefono' => null, 'direccion' => null, 'avatar' => null]);

http_response_code(201);
echo json_encode(['success' => true, 'id_usuario' => $id]);