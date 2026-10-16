<?php
// app/models/IntentoLogin.php
//
// Protección contra fuerza bruta: si hay demasiados intentos fallidos
// recientes para un email o desde una IP, el login se bloquea un rato.

class IntentoLogin extends Modelo {

    const MAX_POR_EMAIL = 5;    // intentos fallidos por cuenta...
    const MAX_POR_IP    = 20;   // ...o por IP...
    const MINUTOS       = 15;   // ...dentro de esta ventana de tiempo

    public function registrar(string $email, string $ip, bool $exito): void {
        $this->ejecutar('INSERT INTO intentos_login (email, ip, exito) VALUES (?, ?, ?)', [$email, $ip, $exito ? 1 : 0]);
        if ($exito) {
            // Un login correcto "perdona" los fallos anteriores de esa cuenta
            $this->ejecutar('DELETE FROM intentos_login WHERE email = ? AND exito = 0', [$email]);
        }
    }

    public function bloqueado(string $email, string $ip): bool {
        $ventana = self::MINUTOS;
        $porEmail = (int)$this->valor(
            "SELECT COUNT(*) FROM intentos_login WHERE email = ? AND exito = 0 AND creado_en > NOW() - INTERVAL $ventana MINUTE", [$email]);
        $porIp = (int)$this->valor(
            "SELECT COUNT(*) FROM intentos_login WHERE ip = ? AND exito = 0 AND creado_en > NOW() - INTERVAL $ventana MINUTE", [$ip]);
        return $porEmail >= self::MAX_POR_EMAIL || $porIp >= self::MAX_POR_IP;
    }
}
