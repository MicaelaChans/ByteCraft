<?php
// app/core/Correo.php
//
// Envío de correos SIN librerías externas: un cliente SMTP mínimo.
// SMTP es el protocolo de envío de mails: es una "conversación" de texto
// con el servidor (smtp.gmail.com), donde cada comando recibe un código:
//
//   nosotros  -> EHLO triunfototal        servidor -> 250 (hola, estas son mis opciones)
//   nosotros  -> STARTTLS                 servidor -> 220 (desde acá todo va CIFRADO con TLS)
//   nosotros  -> AUTH LOGIN + usuario + contraseña de aplicación (en base64)  -> 235 (ok)
//   nosotros  -> MAIL FROM / RCPT TO      servidor -> 250 (remitente y destinatario ok)
//   nosotros  -> DATA + el mensaje + "."  servidor -> 250 (mensaje aceptado)
//   nosotros  -> QUIT
//
// Modos (variable CORREO_MODO):
//   smtp    -> envía de verdad (Gmail del proyecto)
//   archivo -> guarda cada mail como .eml en CORREO_CARPETA (para probar sin internet)
//   ninguno -> no envía nada (la verificación de email queda desactivada)

class Correo {

    public static function modo(): string {
        $modo = Config::get('CORREO_MODO', 'ninguno');
        return in_array($modo, ['smtp', 'archivo', 'ninguno'], true) ? $modo : 'ninguno';
    }

    /** Envía un correo HTML (con versión en texto plano). Lanza Exception si falla. */
    public static function enviar(string $para, string $asunto, string $html, string $texto): void {
        $mensaje = self::armarMensaje($para, $asunto, $html, $texto);

        switch (self::modo()) {
            case 'smtp':
                self::enviarSmtp($para, $mensaje);
                break;
            case 'archivo':
                $carpeta = Config::get('CORREO_CARPETA', sys_get_temp_dir() . '/triunfototal_correos');
                if (!is_dir($carpeta) && !mkdir($carpeta, 0770, true)) {
                    throw new Exception("No se pudo crear la carpeta de correos $carpeta");
                }
                $nombre = date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . '_' . preg_replace('/[^a-z0-9.@_-]/i', '_', $para) . '.eml';
                file_put_contents("$carpeta/$nombre", $mensaje);
                break;
        }
    }

    private static function remitente(): string {
        return Config::get('SMTP_USUARIO', 'no-responder@triunfototal.local');
    }

    /** Arma el mail en formato MIME: cabeceras + parte de texto + parte HTML. */
    private static function armarMensaje(string $para, string $asunto, string $html, string $texto): string {
        $separador = 'tt_' . bin2hex(random_bytes(8));
        $nombre = Config::get('SMTP_NOMBRE', 'TriunfoTotal');
        // Los acentos en las cabeceras se codifican en base64 (RFC 2047)
        $cod = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';

        $cabeceras = [
            'Date: ' . date('r'),
            'From: ' . $cod($nombre) . ' <' . self::remitente() . '>',
            "To: <$para>",
            'Subject: ' . $cod($asunto),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@triunfototal>',
            'MIME-Version: 1.0',
            "Content-Type: multipart/alternative; boundary=\"$separador\"",
        ];
        $partes = [
            "--$separador",
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            chunk_split(base64_encode($texto)),
            "--$separador",
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            chunk_split(base64_encode($html)),
            "--$separador--",
        ];
        return implode("\r\n", $cabeceras) . "\r\n\r\n" . implode("\r\n", $partes);
    }

    private static function enviarSmtp(string $para, string $mensaje): void {
        $host = Config::get('SMTP_HOST', 'smtp.gmail.com');
        $puerto = (int)Config::get('SMTP_PUERTO', '587');
        $usuario = Config::get('SMTP_USUARIO');
        $clave = Config::get('SMTP_CLAVE');

        $conexion = @stream_socket_client("tcp://$host:$puerto", $errno, $errstr, 15);
        if (!$conexion) {
            throw new Exception("No se pudo conectar a $host:$puerto ($errstr)");
        }
        stream_set_timeout($conexion, 15);

        try {
            self::esperar($conexion, 220);
            $opciones = self::comando($conexion, 'EHLO triunfototal', 250);

            // Cifrado TLS antes de mandar la contraseña (Gmail lo exige)
            if (stripos($opciones, 'STARTTLS') !== false) {
                self::comando($conexion, 'STARTTLS', 220);
                if (!stream_socket_enable_crypto($conexion, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
                    throw new Exception('No se pudo iniciar TLS con el servidor de correo');
                }
                self::comando($conexion, 'EHLO triunfototal', 250);
            }

            if ($usuario !== '') {
                self::comando($conexion, 'AUTH LOGIN', 334);
                self::comando($conexion, base64_encode($usuario), 334);
                self::comando($conexion, base64_encode($clave), 235);
            }

            self::comando($conexion, 'MAIL FROM:<' . self::remitente() . '>', 250);
            self::comando($conexion, "RCPT TO:<$para>", 250);
            self::comando($conexion, 'DATA', 354);
            // Una línea que empieza con "." se duplica (si no, el servidor creería que terminó)
            $cuerpo = preg_replace('/^\./m', '..', $mensaje);
            self::comando($conexion, $cuerpo . "\r\n.", 250);
            self::comando($conexion, 'QUIT', 221);
        } finally {
            fclose($conexion);
        }
    }

    /** Envía un comando y verifica el código de respuesta esperado. */
    private static function comando($conexion, string $linea, int $esperado): string {
        fwrite($conexion, $linea . "\r\n");
        return self::esperar($conexion, $esperado);
    }

    /** Lee la respuesta (puede ser de varias líneas: "250-..." ... "250 ..."). */
    private static function esperar($conexion, int $esperado): string {
        $respuesta = '';
        while (($linea = fgets($conexion, 1024)) !== false) {
            $respuesta .= $linea;
            if (strlen($linea) < 4 || $linea[3] === ' ') {
                break;
            }
        }
        if ((int)substr($respuesta, 0, 3) !== $esperado) {
            throw new Exception("El servidor de correo respondió: " . trim($respuesta));
        }
        return $respuesta;
    }
}
