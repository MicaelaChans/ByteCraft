<?php
// app/core/Validador.php
//
// Validación de datos en el BACKEND (nunca confiamos solo en el frontend:
// cualquiera puede mandar una petición a mano con curl o Postman).
//
// Uso:
//   $v = new Validador($datos);
//   $nombre = $v->texto('nombre', 'El nombre', 3, 100);
//   $max    = $v->entero('max_equipos', 'La cantidad de equipos', 2, 128);
//   $v->validar();   // si hubo errores lanza HttpError 422 con la lista

class Validador {
    private array $datos;
    private array $errores = [];

    public function __construct(array $datos) {
        $this->datos = $datos;
    }

    private function valor(string $campo) {
        $v = $this->datos[$campo] ?? null;
        return is_string($v) ? trim($v) : $v;
    }

    private function vacio($v): bool {
        return $v === null || $v === '';
    }

    public function texto(string $campo, string $etiqueta, int $min, int $max, bool $obligatorio = true): ?string {
        $v = $this->valor($campo);
        if ($this->vacio($v)) {
            if ($obligatorio) $this->errores[$campo] = "$etiqueta es obligatorio.";
            return null;
        }
        if (!is_string($v) && !is_numeric($v)) {
            $this->errores[$campo] = "$etiqueta tiene un formato inválido.";
            return null;
        }
        $v = (string)$v;
        $largo = mb_strlen($v);
        if ($largo < $min || $largo > $max) {
            $this->errores[$campo] = "$etiqueta debe tener entre $min y $max caracteres.";
        }
        return $v;
    }

    public function email(string $campo, bool $obligatorio = true): ?string {
        $v = $this->valor($campo);
        if ($this->vacio($v)) {
            if ($obligatorio) $this->errores[$campo] = 'El email es obligatorio.';
            return null;
        }
        if (!is_string($v) || !filter_var($v, FILTER_VALIDATE_EMAIL) || mb_strlen($v) > 150) {
            $this->errores[$campo] = 'Ingresá un email válido.';
            return null;
        }
        return mb_strtolower($v);
    }

    /**
     * Política de contraseñas: mínimo 8 caracteres, al menos una mayúscula,
     * una minúscula y un número (ver docs/ciberseguridad.md).
     */
    public function password(string $campo): ?string {
        $v = $this->datos[$campo] ?? null; // sin trim: los espacios cuentan
        if (!is_string($v) || $v === '') {
            $this->errores[$campo] = 'La contraseña es obligatoria.';
            return null;
        }
        if (strlen($v) < 8 || strlen($v) > 72
            || !preg_match('/[A-Z]/', $v) || !preg_match('/[a-z]/', $v) || !preg_match('/\d/', $v)) {
            $this->errores[$campo] = 'La contraseña debe tener entre 8 y 72 caracteres, con mayúscula, minúscula y número.';
            return null;
        }
        return $v;
    }

    public function entero(string $campo, string $etiqueta, int $min, int $max, bool $obligatorio = true, ?int $porDefecto = null): ?int {
        $v = $this->valor($campo);
        if ($this->vacio($v)) {
            if ($obligatorio) $this->errores[$campo] = "$etiqueta es obligatorio.";
            return $porDefecto;
        }
        if (filter_var($v, FILTER_VALIDATE_INT) === false) {
            $this->errores[$campo] = "$etiqueta debe ser un número entero.";
            return null;
        }
        $v = (int)$v;
        if ($v < $min || $v > $max) {
            $this->errores[$campo] = "$etiqueta debe estar entre $min y $max.";
        }
        return $v;
    }

    public function opcion(string $campo, string $etiqueta, array $permitidos, bool $obligatorio = true, ?string $porDefecto = null): ?string {
        $v = $this->valor($campo);
        if ($this->vacio($v)) {
            if ($obligatorio) $this->errores[$campo] = "$etiqueta es obligatorio.";
            return $porDefecto;
        }
        if (!in_array($v, $permitidos, true)) {
            $this->errores[$campo] = "$etiqueta debe ser uno de: " . implode(', ', $permitidos) . '.';
            return null;
        }
        return $v;
    }

    public function fecha(string $campo, string $etiqueta, bool $obligatorio = false): ?string {
        $v = $this->valor($campo);
        if ($this->vacio($v)) {
            if ($obligatorio) $this->errores[$campo] = "$etiqueta es obligatoria.";
            return null;
        }
        $f = is_string($v) ? DateTime::createFromFormat('Y-m-d', $v) : false;
        if (!$f || $f->format('Y-m-d') !== $v) {
            $this->errores[$campo] = "$etiqueta debe tener formato AAAA-MM-DD.";
            return null;
        }
        return $v;
    }

    public function fechaHora(string $campo, string $etiqueta): ?string {
        $v = $this->valor($campo);
        if ($this->vacio($v)) return null;
        $ts = is_string($v) ? strtotime($v) : false;
        if ($ts === false) {
            $this->errores[$campo] = "$etiqueta no es una fecha válida.";
            return null;
        }
        return date('Y-m-d H:i:s', $ts);
    }

    public function booleano(string $campo, bool $porDefecto = false): bool {
        $v = $this->datos[$campo] ?? null;
        if ($v === null || $v === '') return $porDefecto;
        return filter_var($v, FILTER_VALIDATE_BOOLEAN);
    }

    /** Agrega un error manual (reglas que dependen de varios campos). */
    public function error(string $campo, string $mensaje): void {
        $this->errores[$campo] = $mensaje;
    }

    public function validar(): void {
        if ($this->errores) {
            throw new HttpError(422, 'Revisá los datos ingresados.', $this->errores);
        }
    }
}
