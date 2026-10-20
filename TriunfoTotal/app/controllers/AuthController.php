<?php
// app/controllers/AuthController.php
//
// Registro, login, logout, "¿quién soy?" (para que React recupere la
// sesión al recargar la página) y verificación del email.
//
// Verificación de email (si CORREO_MODO es smtp o archivo):
//   1) al registrarse se manda un mail con un link que tiene un token aleatorio
//   2) hasta tocar el link, la cuenta NO puede iniciar sesión
//   3) el link lleva a /verificar-email, que llama a POST /auth/verificar

class AuthController extends Controlador {

    /** POST /auth/registro */
    public function registro(): void {
        $v = new Validador($this->cuerpo());
        $nombre   = $v->texto('nombre', 'El nombre', 2, 100);
        $apellido = $v->texto('apellido', 'El apellido', 2, 100);
        $email    = $v->email('email');
        $password = $v->password('password');
        $v->validar();

        // El dominio tiene que existir y poder recibir correo (registro MX en el DNS)
        if (!Usuario::dominioRecibeCorreo($email)) {
            $msj = 'Ese dominio de correo no existe o no recibe emails. Revisá que esté bien escrito.';
            throw new HttpError(422, $msj, ['email' => $msj]);
        }

        $usuarios = new Usuario();
        if ($usuarios->buscarPorEmail($email)) {
            throw new HttpError(409, 'Ese email ya está registrado.', ['email' => 'Ese email ya está registrado.']);
        }

        $verificar = Config::verificacionEmailActiva();
        $id = $usuarios->registrar($nombre, $apellido, $email, $password, !$verificar);

        if ($verificar) {
            // No se inicia sesión: primero tiene que confirmar el email
            $this->enviarVerificacion($id, $nombre, $email);
            $this->ok([
                'requiere_verificacion' => true,
                'email' => $email,
                'mensaje' => "Te enviamos un email a $email. Tocá el link para activar tu cuenta.",
            ], 201);
            return;
        }

        Sesion::login($id);
        (new Auditoria())->evento('LOGIN', $id, 'Inicio de sesión tras registrarse');
        $this->ok($usuarios->buscarPorId($id), 201);
    }

    /** POST /auth/verificar   body: { token } -> activa la cuenta e inicia sesión */
    public function verificar(): void {
        $token = (string)($this->cuerpo()['token'] ?? '');
        $usuarios = new Usuario();
        $id = $usuarios->verificarToken($token);
        if ($id === null) {
            throw new HttpError(400, 'El link no es válido o ya venció. Pedí uno nuevo desde la pantalla de inicio de sesión.');
        }
        $usuario = $usuarios->buscarPorId($id);
        if ($usuario['estado'] !== 'Activo') {
            throw new HttpError(403, 'Tu cuenta está suspendida. Contactá a un administrador.');
        }
        Sesion::login($id);
        (new Auditoria())->evento('LOGIN', $id, 'Email verificado e inicio de sesión');
        $this->ok($usuario);
    }

    /** POST /auth/reenviar-verificacion   body: { email } */
    public function reenviarVerificacion(): void {
        $email = mb_strtolower(trim((string)($this->cuerpo()['email'] ?? '')));
        // Respuesta SIEMPRE igual, exista o no el email (no revela qué cuentas existen)
        $respuesta = ['mensaje' => 'Si ese email está registrado y sin verificar, te enviamos un link nuevo.'];

        if (!Config::verificacionEmailActiva() || $email === '') {
            $this->ok($respuesta);
            return;
        }
        $usuarios = new Usuario();
        $u = $usuarios->buscarPorEmail($email);
        if ($u && !(int)$u['email_verificado'] && $u['estado'] === 'Activo') {
            if (!$usuarios->puedeReenviarVerificacion((int)$u['id_usuario'])) {
                throw new HttpError(429, 'Ya te mandamos un email hace muy poco. Esperá un minuto y probá de nuevo.');
            }
            $this->enviarVerificacion((int)$u['id_usuario'], $u['nombre'], $email);
        }
        $this->ok($respuesta);
    }

    /** Crea el token y manda el mail. Si el correo falla, avisa sin perder la cuenta creada. */
    private function enviarVerificacion(int $idUsuario, string $nombre, string $email): void {
        $token = (new Usuario())->crearTokenVerificacion($idUsuario);
        $link = $this->urlFrontend() . '/verificar-email?token=' . $token;
        $nombreSeguro = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');
        $horas = Usuario::HORAS_VALIDEZ_TOKEN;

        $html = <<<HTML
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222">
  <h2 style="color:#1b6fa3">¡Bienvenido/a a TriunfoTotal, {$nombreSeguro}!</h2>
  <p>Para activar tu cuenta, confirmá tu email tocando el botón:</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{$link}" style="background:#60B7E8;color:#08324a;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar mi email</a>
  </p>
  <p style="font-size:13px;color:#555">Si el botón no funciona, copiá este link en el navegador:<br>{$link}</p>
  <p style="font-size:13px;color:#555">El link vence en {$horas} horas. Si no creaste esta cuenta, ignorá este mensaje.</p>
  <hr style="border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#888">TriunfoTotal — "Todos los juegos, una sola pasión." · ByteCraft</p>
</div>
HTML;
        $texto = "¡Bienvenido/a a TriunfoTotal, $nombre!\n\nPara activar tu cuenta abrí este link:\n$link\n\n"
               . "El link vence en $horas horas. Si no creaste esta cuenta, ignorá este mensaje.";

        try {
            Correo::enviar($email, 'Confirmá tu cuenta en TriunfoTotal', $html, $texto);
        } catch (Throwable $e) {
            error_log('[TriunfoTotal][Correo] ' . $e->getMessage());
            throw new HttpError(502, 'Tu cuenta se creó, pero no pudimos enviarte el email de verificación. '
                . 'Probá "Reenviar email" desde el inicio de sesión en unos minutos.');
        }
    }

    /**
     * Dirección del frontend para armar el link del mail.
     * APP_URL si está configurada; si no, el origen desde donde se registró
     * (así funciona igual en localhost:5173, en Docker o en la VM).
     */
    private function urlFrontend(): string {
        $url = Config::get('APP_URL');
        if ($url === '') {
            $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
            if (preg_match('#^https?://[a-z0-9.\-]+(:\d+)?$#i', $origen)) {
                $url = $origen;
            } else {
                $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
                $url = ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
            }
        }
        return rtrim($url, '/');
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
        if (!(int)$usuario['email_verificado']) {
            throw new HttpError(403, 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y la carpeta de spam).',
                ['codigo' => 'email_no_verificado']);
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
