<?php
// app/models/Usuario.php
//
// MODELO de usuarios: registro, login, roles dinámicos y perfil.

class Usuario extends Modelo {

    const ROL_ADMIN   = 1;
    const ROL_USUARIO = 2;

    // Columnas "seguras" (nunca incluye password_hash)
    private const CAMPOS = 'id_usuario, nombre, apellido, alias, email, telefono, direccion, avatar, estado, creado_en';

    /**
     * Crea un nuevo usuario. El hash de la contraseña se calcula ACÁ,
     * nunca en el frontend ni en el controlador. Usa bcrypt (PASSWORD_DEFAULT),
     * que incluye "sal" aleatoria y es lento a propósito (frena fuerza bruta).
     */
    public function registrar(string $nombre, string $apellido, string $email, string $passwordPlano): int {
        return $this->transaccion(function () use ($nombre, $apellido, $email, $passwordPlano) {
            $hash = password_hash($passwordPlano, PASSWORD_DEFAULT);
            $this->ejecutar(
                'INSERT INTO usuarios (nombre, apellido, email, password_hash) VALUES (?, ?, ?, ?)',
                [$nombre, $apellido, $email, $hash]
            );
            $idNuevo = (int)$this->db->lastInsertId();

            // Todo usuario nuevo arranca con el rol base 'Usuario'.
            // No hace falta un rol 'Organizador': cualquier Usuario puede organizar
            // torneos, y eso se valida por dueño (torneos.id_organizador), no por rol.
            $this->asignarRol($idNuevo, self::ROL_USUARIO);
            return $idNuevo;
        });
    }

    /** Asigna un rol (si ya lo tenía, no lo duplica). */
    public function asignarRol(int $idUsuario, int $idRol): void {
        $this->ejecutar('INSERT IGNORE INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)', [$idUsuario, $idRol]);
    }

    public function quitarRol(int $idUsuario, int $idRol): void {
        $this->ejecutar('DELETE FROM usuario_roles WHERE id_usuario = ? AND id_rol = ?', [$idUsuario, $idRol]);
    }

    /** Nombres de los roles dinámicos del usuario. Ej: ['Administrador', 'Usuario'] */
    public function obtenerRoles(int $idUsuario): array {
        $stmt = $this->db->prepare(
            'SELECT r.nombre_rol FROM usuario_roles ur
               JOIN roles r ON r.id_rol = ur.id_rol
              WHERE ur.id_usuario = ? ORDER BY r.id_rol'
        );
        $stmt->execute([$idUsuario]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function esAdmin(int $idUsuario): bool {
        return in_array('Administrador', $this->obtenerRoles($idUsuario), true);
    }

    /** Incluye password_hash: SOLO para uso interno del login. */
    public function buscarPorEmail(string $email): array|false {
        return $this->uno('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [$email]);
    }

    /** Usuario sin datos sensibles + sus roles. */
    public function buscarPorId(int $id): array|false {
        $usuario = $this->uno('SELECT ' . self::CAMPOS . ' FROM usuarios WHERE id_usuario = ? LIMIT 1', [$id]);
        if (!$usuario) {
            return false;
        }
        $usuario['roles'] = $this->obtenerRoles($id);
        return $usuario;
    }

    /** Busca por email o alias (para agregar miembros a un equipo). */
    public function buscarPorEmailOAlias(string $texto): array|false {
        return $this->uno(
            'SELECT id_usuario, nombre, apellido, alias, estado FROM usuarios WHERE email = ? OR alias = ? LIMIT 1',
            [mb_strtolower($texto), $texto]
        );
    }

    /**
     * Verifica credenciales. Devuelve el usuario (sin hash, con roles) o false.
     * Si está baneado devuelve ['baneado' => true] para avisar.
     */
    public function verificarCredenciales(string $email, string $passwordPlano): array|false {
        $usuario = $this->buscarPorEmail($email);

        // Si el email no existe igual calculamos un hash: así la respuesta tarda
        // lo mismo y no se puede adivinar qué emails están registrados.
        if (!$usuario) {
            password_verify($passwordPlano, '$2y$10$Lu9V/xMFpTy47SifG6h5ieuiNAsmL3kPz6uf/o3Dotmei6c9gx/uq');
            return false;
        }
        if (!password_verify($passwordPlano, $usuario['password_hash'])) {
            return false;
        }
        if ($usuario['estado'] === 'Baneado') {
            return ['baneado' => true];
        }

        // Si PHP mejora el algoritmo/costo por defecto, re-hasheamos de forma transparente
        if (password_needs_rehash($usuario['password_hash'], PASSWORD_DEFAULT)) {
            $this->cambiarPassword((int)$usuario['id_usuario'], $passwordPlano);
        }
        return $this->buscarPorId((int)$usuario['id_usuario']);
    }

    public function cambiarPassword(int $id, string $passwordPlano): void {
        $this->ejecutar('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
            [password_hash($passwordPlano, PASSWORD_DEFAULT), $id]);
    }

    public function passwordCorrecta(int $id, string $passwordPlano): bool {
        $hash = $this->valor('SELECT password_hash FROM usuarios WHERE id_usuario = ?', [$id]);
        return $hash !== false && password_verify($passwordPlano, $hash);
    }

    /** Actualiza los datos de perfil editables (los que usa Profile.jsx). */
    public function actualizarPerfil(int $id, array $datos): void {
        $this->ejecutar(
            'UPDATE usuarios
                SET nombre = ?, apellido = ?, alias = ?, telefono = ?, direccion = ?, avatar = ?
              WHERE id_usuario = ?',
            [
                $datos['nombre'],
                $datos['apellido']  ?? null,
                $datos['alias']     ?? null,
                $datos['telefono']  ?? null,
                $datos['direccion'] ?? null,
                $datos['avatar']    ?? null,
                $id,
            ]
        );
    }

    /** Chequea si un alias ya está en uso por OTRO usuario. */
    public function aliasDisponible(string $alias, int $idExcluir): bool {
        return $this->uno('SELECT id_usuario FROM usuarios WHERE alias = ? AND id_usuario <> ?', [$alias, $idExcluir]) === false;
    }

    // ------------------------------------------------------------------
    // Administración
    // ------------------------------------------------------------------

    /** Listado para el panel de admin, con búsqueda y paginado. */
    public function listar(string $busqueda = '', int $pagina = 1, int $porPagina = 20): array {
        $filtro = '%' . $busqueda . '%';
        $offset = max(0, ($pagina - 1) * $porPagina);

        $total = (int)$this->valor(
            'SELECT COUNT(*) FROM usuarios WHERE nombre LIKE ? OR apellido LIKE ? OR email LIKE ? OR alias LIKE ?',
            [$filtro, $filtro, $filtro, $filtro]
        );
        $filas = $this->todos(
            "SELECT u.id_usuario, u.nombre, u.apellido, u.alias, u.email, u.estado, u.creado_en,
                    GROUP_CONCAT(r.nombre_rol ORDER BY r.id_rol) AS roles
               FROM usuarios u
               LEFT JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
               LEFT JOIN roles r ON r.id_rol = ur.id_rol
              WHERE u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ? OR u.alias LIKE ?
              GROUP BY u.id_usuario
              ORDER BY u.id_usuario
              LIMIT $porPagina OFFSET $offset",
            [$filtro, $filtro, $filtro, $filtro]
        );
        foreach ($filas as &$f) {
            $f['roles'] = $f['roles'] ? explode(',', $f['roles']) : [];
        }
        return ['usuarios' => $filas, 'total' => $total, 'pagina' => $pagina, 'por_pagina' => $porPagina];
    }

    public function cambiarEstado(int $id, string $estado): void {
        $this->ejecutar('UPDATE usuarios SET estado = ? WHERE id_usuario = ?', [$estado, $id]);
    }

    /** Ids de los administradores activos (para avisarles por notificación). */
    public function idsAdmins(): array {
        $stmt = $this->db->prepare(
            "SELECT u.id_usuario FROM usuarios u JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
              WHERE ur.id_rol = ? AND u.estado = 'Activo'");
        $stmt->execute([self::ROL_ADMIN]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function cantidadAdmins(): int {
        return (int)$this->valor(
            "SELECT COUNT(*) FROM usuario_roles ur JOIN usuarios u ON u.id_usuario = ur.id_usuario
              WHERE ur.id_rol = ? AND u.estado = 'Activo'", [self::ROL_ADMIN]);
    }
}
