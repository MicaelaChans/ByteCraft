<?php
// api/usuario.php

// Carga dinámica de conexión para evitar Errores 500 por rutas absolutas o relativas
$rutaConexion = __DIR__ . '/../config/Conexion.php';

if (!file_exists($rutaConexion)) {
    $rutaConexion = $_SERVER['DOCUMENT_ROOT'] . '/config/conexion.php';
}

require_once $rutaConexion;

class Usuario {
    private PDO $db;

    public function __construct() {
        $this->db = Conexion::getConexion();
    }

    /**
     * Crea un nuevo usuario. El hash de la contraseña se calcula ACÁ,
     * nunca en el frontend ni en el controlador.
     */
    public function registrar(string $nombre, string $email, string $passwordPlano): int|false {
        $hash = password_hash($passwordPlano, PASSWORD_DEFAULT);

        $sql = "INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $ok = $stmt->execute([$nombre, $email, $hash]);

        return $ok ? (int)$this->db->lastInsertId() : false;
    }

    /**
     * Busca un usuario por email. Se usa en el login.
     */
    public function buscarPorEmail(string $email): array|false {
        $sql = "SELECT * FROM usuarios WHERE email = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$email]);
        return $stmt->fetch(); // false si no existe
    }

    /**
     * Busca un usuario por id (sin exponer password_hash al front).
     */
    public function buscarPorId(int $id): array|false {
        $sql = "SELECT id_usuario, nombre, apellido, alias, email, telefono, direccion, avatar, es_admin, estado, creado_en
                FROM usuarios WHERE id_usuario = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Verifica credenciales de login. Devuelve el usuario (sin hash) o false.
     */
    public function verificarCredenciales(string $email, string $passwordPlano): array|false {
        $usuario = $this->buscarPorEmail($email);

        if (!$usuario) {
            return false;
        }

        if ($usuario['estado'] === 'Baneado') {
            return false;
        }

        if (!password_verify($passwordPlano, $usuario['password_hash'])) {
            return false;
        }

        unset($usuario['password_hash']); // nunca devolver el hash
        return $usuario;
    }

    /**
     * Actualiza los datos de perfil editables (los que usa Profile.jsx).
     */
    public function actualizarPerfil(int $id, array $datos): bool {
        $sql = "UPDATE usuarios
                SET apellido = ?, alias = ?, telefono = ?, direccion = ?, avatar = ?
                WHERE id_usuario = ?";
        $stmt = $this->db->prepare($sql);

        return $stmt->execute([
            $datos['apellido']  ?? null,
            $datos['alias']     ?? null,
            $datos['telefono']  ?? null,
            $datos['direccion'] ?? null,
            $datos['avatar']    ?? null,
            $id,
        ]);
    }

    /**
     * Chequea si un alias ya está en uso por otro usuario (para validar unicidad).
     */
    public function aliasDisponible(string $alias, int $idExcluir): bool {
        $sql = "SELECT id_usuario FROM usuarios WHERE alias = ? AND id_usuario != ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$alias, $idExcluir]);
        return $stmt->fetch() === false;
    }
}