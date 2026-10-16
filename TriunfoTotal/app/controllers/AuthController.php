<?php
// app/controllers/AuthController.php
//
// Registro, login, logout y "¿quién soy?" (para que React recupere la
// sesión al recargar la página).

class AuthController extends Controlador {

    /** POST /auth/registro */
    public function registro(): void {
        $v = new Validador($this->cuerpo());
        $nombre   = $v->texto('nombre', 'El nombre', 2, 100);
        $apellido = $v->texto('apellido', 'El apellido', 2, 100);
        $email    = $v->email('email');
        $password = $v->password('password');
        $v->validar();

        $usuarios = new Usuario();
        if ($usuarios->buscarPorEmail($email)) {
            throw new HttpError(409, 'Ese email ya está registrado.', ['email' => 'Ese email ya está registrado.']);
        }

        $id = $usuarios->registrar($nombre, $apellido, $email, $password);
        Sesion::login($id);
        (new Auditoria())->evento('LOGIN', $id, 'Inicio de sesión tras registrarse');

        $this->ok($usuarios->buscarPorId($id), 201);
    }

    /** POST /auth/login */
    public function login(): void {
        $datos = $this->cuerpo();
        $email = mb_strtolower(trim((string)($datos['email'] ?? '')));
        $password = (string)($datos['password'] ?? '');

        if ($email === '' || $password === '') {
            throw new HttpError(422, 'Email y contraseña son obligatorios.');
        }

        $intentos = new IntentoLogin();
        $ip = Sesion::ip();
        if ($intentos->bloqueado($email, $ip)) {
            throw new HttpError(429, 'Demasiados intentos fallidos. Esperá ' . IntentoLogin::MINUTOS . ' minutos y probá de nuevo.');
        }

        $usuario = (new Usuario())->verificarCredenciales($email, $password);

        if (!$usuario) {
            $intentos->registrar($email, $ip, false);
            (new Auditoria())->evento('LOGIN_FALLIDO', null, "Intento fallido para $email");
            // Mensaje genérico: no revela si el email existe o no
            throw new HttpError(401, 'Email o contraseña incorrectos.');
        }
        if (!empty($usuario['baneado'])) {
            throw new HttpError(403, 'Tu cuenta está suspendida. Contactá a un administrador.');
        }

        $intentos->registrar($email, $ip, true);
        Sesion::login((int)$usuario['id_usuario']);
        (new Auditoria())->evento('LOGIN', (int)$usuario['id_usuario'], 'Inicio de sesión');

        $this->ok($usuario);
    }

    /** POST /auth/logout */
    public function logout(): void {
        $id = Sesion::idUsuario();
        if ($id) {
            (new Auditoria())->evento('LOGOUT', $id, 'Cierre de sesión');
        }
        Sesion::cerrar();
        $this->ok(null);
    }

    /** GET /auth/sesion -> usuario logueado o null */
    public function sesion(): void {
        $u = Sesion::usuario();
        if ($u) {
            $u['notificaciones_no_leidas'] = (new Notificacion())->noLeidas((int)$u['id_usuario']);
        }
        $this->ok($u);
    }
}
