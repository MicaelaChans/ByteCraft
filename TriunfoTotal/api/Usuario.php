<?php
// api/Usuario.php

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

        if (!$ok) {
            return false;
        }

        $idNuevo = (int)$this->db->lastInsertId();

        // Todo usuario nuevo arranca con el rol base 'Usuario' (id_rol = 2).
        // No hace falta un rol 'Organizador' aparte: cualquier Usuario puede
        // organizar torneos, eso se valida por dueño (torneos.id_organizador),
        // no por rol.
        $this->asignarRol($idNuevo, 2);

        return $idNuevo;
    }

    /**
     * Asigna un rol a un usuario (alta en usuario_roles). Si ya lo tenía,
     * no lo duplica.
     */
    public function asignarRol(int $idUsuario, int $idRol): bool {
        $sql = "INSERT INTO usuario_roles (id_usuario, id_rol)
                SELECT :id_usuario, :id_rol
                WHERE NOT EXISTS (
                    SELECT 1 FROM usuario_roles
                    WHERE id_usuario = :id_usuario AND id_rol = :id_rol
                )";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id_usuario' => $idUsuario, ':id_rol' => $idRol]);
    }

    /**
     * Devuelve los nombres de los roles dinámicos de un usuario
     * (JOIN usuario_roles + roles). Ej: ['Administrador'] o ['Usuario'].
     */
    public function obtenerRoles(int $idUsuario): array {
        $sql = "SELECT r.nombre_rol
                FROM usuario_roles ur
                JOIN roles r ON r.id_rol = ur.id_rol
                WHERE ur.id_usuario = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idUsuario]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    /**
     * True si el usuario tiene el rol 'Administrador'. Esta es la fuente
     * de verdad para permisos de admin, ya no usar la columna es_admin.
     */
    public function esAdmin(int $idUsuario): bool {
        return in_array('Administrador', $this->obtenerRoles($idUsuario), true);
    }

    /**
     * True si el usuario es el dueño (organizador) del torneo indicado.
     * 'Organizador' no es un rol global: es simplemente ser el creador
     * de ESE torneo puntual (torneos.id_organizador).
     */
    public function esDueñoDelTorneo(int $idTorneo, int $idUsuario): bool {
        $sql = "SELECT 1 FROM torneos WHERE id_torneo = ? AND id_organizador = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$idTorneo, $idUsuario]);
        return $stmt->fetch() !== false;
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
     * Incluye los roles dinámicos. La columna es_admin se sigue trayendo
     * solo por compatibilidad, pero no debe usarse más para permisos.
     */
    public function buscarPorId(int $id): array|false {
        $sql = "SELECT id_usuario, nombre, apellido, alias, email, telefono, direccion, avatar, es_admin, estado, creado_en
                FROM usuarios WHERE id_usuario = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $usuario = $stmt->fetch();

        if (!$usuario) {
            return false;
        }

        $usuario['roles'] = $this->obtenerRoles($id);
        return $usuario;
    }

    /**
     * Verifica credenciales de login. Devuelve el usuario (sin hash,
     * con sus roles dinámicos) o false.
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
        $usuario['roles'] = $this->obtenerRoles((int)$usuario['id_usuario']);
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