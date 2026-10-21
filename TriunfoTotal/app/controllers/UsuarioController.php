<?php
// app/controllers/UsuarioController.php
//
// Perfiles PÚBLICOS de usuarios y el sistema de seguidores.
// Un perfil público muestra solo datos no sensibles: nombre, alias, foto,
// estadísticas y torneos que organiza. NUNCA email, teléfono ni dirección.

class UsuarioController extends Controlador {

    /** GET /usuarios?q=  -> buscar personas por nombre o alias */
    public function buscar(): void {
        $q = $this->query('q', '');
        if (mb_strlen($q) < 2) {
            $this->ok([]);
            return;
        }
        $this->ok((new Usuario())->buscarPublico($q));
    }

    /** GET /usuarios/{id}  -> perfil público */
    public function perfil(int $id): void {
        $usuarios = new Usuario();
        $u = $usuarios->buscarPorId($id);
        if (!$u || $u['estado'] !== 'Activo') {
            throw new HttpError(404, 'Ese usuario no existe.');
        }
        $seguidores = new Seguidor();
        $yo = Sesion::idUsuario();

        // Solo los torneos aprobados (los formales pendientes no son públicos)
        $organizados = array_values(array_filter(
            (new Torneo())->organizadosPor($id),
            fn($t) => $t['estado_aprobacion'] === 'Aprobado'
        ));

        $this->ok([
            'usuario' => [
                'id_usuario' => (int)$u['id_usuario'],
                'nombre'     => $u['nombre'],
                'apellido'   => $u['apellido'],
                'alias'      => $u['alias'],
                'avatar'     => $u['avatar'],
                'creado_en'  => $u['creado_en'],
            ],
            // "Reputación" simple que no se puede manipular: se calcula de datos reales
            'estadisticas' => [
                'seguidores'          => $seguidores->cantidadSeguidores($id),
                'seguidos'            => $seguidores->cantidadSeguidos($id),
                'torneos_organizados' => count($organizados),
                'torneos_finalizados' => count(array_filter($organizados, fn($t) => $t['estado_torneo'] === 'Finalizado')),
                'participaciones'     => $usuarios->cantidadParticipaciones($id),
            ],
            'torneos'   => $organizados,
            'yo_sigo'   => $yo !== null && $seguidores->sigue($yo, $id),
            'es_yo'     => $yo === $id,
        ]);
    }

    /** POST /usuarios/{id}/seguir */
    public function seguir(int $id): void {
        $yo = Sesion::exigirLogin();
        $idYo = (int)$yo['id_usuario'];
        if ($idYo === $id) {
            throw new HttpError(422, 'No te podés seguir a vos mismo.');
        }
        $seguido = (new Usuario())->buscarPorId($id);
        if (!$seguido || $seguido['estado'] !== 'Activo') {
            throw new HttpError(404, 'Ese usuario no existe.');
        }
        if ((new Seguidor())->seguir($idYo, $id)) {
            (new Notificacion())->crear($id, 'Nuevo_Seguidor', "{$yo['nombre']} {$yo['apellido']} empezó a seguirte.", 'usuario', $idYo);
        }
        $this->ok(['mensaje' => "Ahora seguís a {$seguido['nombre']}. Te avisamos cuando publique un torneo."]);
    }

    /** DELETE /usuarios/{id}/seguir */
    public function dejarDeSeguir(int $id): void {
        $yo = Sesion::exigirLogin();
        (new Seguidor())->dejarDeSeguir((int)$yo['id_usuario'], $id);
        $this->ok(['mensaje' => 'Dejaste de seguir a esta persona.']);
    }

    /** GET /perfil/seguidos  -> a quiénes sigo yo */
    public function seguidos(): void {
        $yo = Sesion::exigirLogin();
        $this->ok((new Seguidor())->seguidosPor((int)$yo['id_usuario']));
    }
}
