<?php
// app/core/Sesion.php
//
// Autenticación y autorización basada en roles.
// La sesión del servidor solo guarda el id del usuario. Los roles y el
// estado (Activo/Baneado) se leen de la base en CADA petición: si el admin
// banea a alguien o le saca un rol, el cambio aplica al instante.

class Sesion {
    private static ?array $usuario = null;
    private static bool $cargado = false;

    public static function iniciar(): void {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
              || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

        session_name('TTSESSID');
        session_set_cookie_params([
            'lifetime' => 0,          // dura hasta cerrar el navegador
            'path'     => '/',
            'secure'   => $https,     // solo viaja por HTTPS cuando hay HTTPS
            'httponly' => true,       // JavaScript no puede leerla (mitiga robo por XSS)
            'samesite' => 'Strict',   // no viaja en peticiones de otros sitios (mitiga CSRF)
        ]);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_start();

        // Expira la sesión tras 2 horas de inactividad
        $ahora = time();
        if (isset($_SESSION['ultimo_acceso']) && $ahora - $_SESSION['ultimo_acceso'] > 7200) {
            self::cerrar();
            session_start();
        }
        $_SESSION['ultimo_acceso'] = $ahora;
    }

    /** Guarda el login. Regenera el id de sesión para evitar "session fixation". */
    public static function login(int $idUsuario): void {
        session_regenerate_id(true);
        $_SESSION['id_usuario'] = $idUsuario;
        self::$cargado = false;
        Conexion::setContextoAuditoria($idUsuario, self::ip());
    }

    public static function cerrar(): void {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'] ?? '', $p['secure'], $p['httponly']);
        }
        session_destroy();
        self::$usuario = null;
        self::$cargado = true;
    }

    /** Devuelve el usuario logueado (con sus roles) o null. */
    public static function usuario(): ?array {
        if (!self::$cargado) {
            self::$cargado = true;
            self::$usuario = null;
            if (isset($_SESSION['id_usuario'])) {
                $u = (new Usuario())->buscarPorId((int)$_SESSION['id_usuario']);
                if ($u && $u['estado'] === 'Activo') {
                    self::$usuario = $u;
                } else {
                    self::cerrar(); // borrado o baneado: se le corta la sesión
                }
            }
        }
        return self::$usuario;
    }

    public static function idUsuario(): ?int {
        $u = self::usuario();
        return $u ? (int)$u['id_usuario'] : null;
    }

    public static function esAdmin(): bool {
        $u = self::usuario();
        return $u !== null && in_array('Administrador', $u['roles'], true);
    }

    /** Corta con 401 si no hay nadie logueado. Devuelve el usuario. */
    public static function exigirLogin(): array {
        $u = self::usuario();
        if ($u === null) {
            throw new HttpError(401, 'Tenés que iniciar sesión para hacer esto.');
        }
        return $u;
    }

    /** Corta con 403 si el usuario no es Administrador. */
    public static function exigirAdmin(): array {
        $u = self::exigirLogin();
        if (!self::esAdmin()) {
            throw new HttpError(403, 'Solo un administrador puede hacer esto.');
        }
        return $u;
    }

    public static function ip(): string {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
