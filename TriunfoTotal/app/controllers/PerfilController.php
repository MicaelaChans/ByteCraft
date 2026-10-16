<?php
// app/controllers/PerfilController.php
//
// Datos del usuario logueado: ver/editar perfil, cambiar contraseña,
// y "mis torneos" (los que organizo y en los que participo).

class PerfilController extends Controlador {

    /** PUT /perfil */
    public function actualizar(): void {
        $yo = Sesion::exigirLogin();
        $datos = $this->cuerpo();
        $v = new Validador($datos);

        $limpio = [
            'nombre'    => $v->texto('nombre', 'El nombre', 2, 100),
            'apellido'  => $v->texto('apellido', 'El apellido', 2, 100, false),
            'alias'     => $v->texto('alias', 'El alias', 3, 30, false),
            'telefono'  => $v->texto('telefono', 'El teléfono', 6, 20, false),
            'direccion' => $v->texto('direccion', 'La dirección', 3, 255, false),
            'avatar'    => $datos['avatar'] ?? null,
        ];

        if ($limpio['alias'] !== null) {
            if (!preg_match('/^[A-Za-z0-9_.]+$/', $limpio['alias'])) {
                $v->error('alias', 'El alias solo puede tener letras, números, punto y guion bajo.');
            } elseif (!(new Usuario())->aliasDisponible($limpio['alias'], (int)$yo['id_usuario'])) {
                $v->error('alias', 'Ese alias ya lo usa otra persona.');
            }
        }
        if ($limpio['telefono'] !== null && !preg_match('/^[0-9+\-\s()]+$/', $limpio['telefono'])) {
            $v->error('telefono', 'El teléfono solo puede tener números, espacios, +, - y paréntesis.');
        }
        // Avatar: solo imágenes en base64 y de tamaño razonable (evita subir cualquier cosa)
        if ($limpio['avatar'] !== null && $limpio['avatar'] !== '') {
            if (!is_string($limpio['avatar'])
                || !preg_match('#^data:image/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$#', $limpio['avatar'])) {
                $v->error('avatar', 'La foto debe ser una imagen PNG, JPG, WEBP o GIF.');
            } elseif (strlen($limpio['avatar']) > 2_000_000) {
                $v->error('avatar', 'La foto es muy pesada (máximo ~1,5 MB).');
            }
        } else {
            $limpio['avatar'] = null;
        }
        $v->validar();

        $usuarios = new Usuario();
        $usuarios->actualizarPerfil((int)$yo['id_usuario'], $limpio);
        $this->ok($usuarios->buscarPorId((int)$yo['id_usuario']));
    }

    /** PUT /perfil/password */
    public function cambiarPassword(): void {
        $yo = Sesion::exigirLogin();
        $datos = $this->cuerpo();
        $v = new Validador($datos);
        $nueva = $v->password('nueva');
        $v->validar();

        $usuarios = new Usuario();
        if (!$usuarios->passwordCorrecta((int)$yo['id_usuario'], (string)($datos['actual'] ?? ''))) {
            throw new HttpError(422, 'La contraseña actual no es correcta.', ['actual' => 'La contraseña actual no es correcta.']);
        }
        $usuarios->cambiarPassword((int)$yo['id_usuario'], $nueva);
        $this->ok(['mensaje' => 'Contraseña actualizada.']);
    }

    /** GET /perfil/torneos */
    public function torneos(): void {
        $yo = Sesion::exigirLogin();
        $torneos = new Torneo();
        $this->ok([
            'organizados' => $torneos->organizadosPor((int)$yo['id_usuario']),
            'participando' => $torneos->participadosPor((int)$yo['id_usuario']),
        ]);
    }
}
