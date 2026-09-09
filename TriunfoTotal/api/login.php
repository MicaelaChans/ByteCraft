<?php
// api/login.php

require_once __DIR__ . '/usuario.php';

session_start(); // necesitamos guardar quién está logueado

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true'); // para que la cookie de sesión viaje
header('Content-Type: application/json');

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

$email    = trim($datos['email']    ?? '');
$password = $datos['password']      ?? '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email y contraseña son obligatorios']);
    exit;
}

$usuarioModel = new Usuario();
$usuario = $usuarioModel->verificarCredenciales($email, $password);

if (!$usuario) {
    http_response_code(401); // 401 = credenciales inválidas
    echo json_encode(['error' => 'Email o contraseña incorrectos']);
    exit;
}

// Guardamos el id en la sesión del servidor (esto es lo que "recuerda" que estás logueado)
$_SESSION['id_usuario'] = $usuario['id_usuario'];
$_SESSION['es_admin']   = $usuario['es_admin'];

http_response_code(200);
echo json_encode(['success' => true, 'usuario' => $usuario]);