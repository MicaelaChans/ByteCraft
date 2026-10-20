<?php
// app/core/Config.php
//
// Lee la configuración de la app. Igual que la conexión a la base:
//   1) primero las variables de entorno (Docker, archivo .env)
//   2) después las constantes de config/config.local.php (instalación local)
//   3) y si no hay nada, el valor por defecto.

class Config {
    public static function get(string $clave, string $porDefecto = ''): string {
        $env = getenv($clave);
        if ($env !== false && $env !== '') {
            return $env;
        }
        return defined($clave) ? (string)constant($clave) : $porDefecto;
    }

    public static function bool(string $clave, bool $porDefecto): bool {
        $v = self::get($clave, $porDefecto ? 'true' : 'false');
        return filter_var($v, FILTER_VALIDATE_BOOLEAN);
    }

    /** ¿Hay que verificar el email al registrarse? Solo si hay forma de enviar correos. */
    public static function verificacionEmailActiva(): bool {
        return in_array(Correo::modo(), ['smtp', 'archivo'], true);
    }
}
