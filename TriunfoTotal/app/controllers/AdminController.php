<?php
// app/controllers/AdminController.php
//
// Módulo de administración del sistema (solo rol Administrador):
// aprobar torneos formales, gestionar usuarios y roles, habilitar
// módulos de competencia, reportes y auditoría.

class AdminController extends Controlador {

    public function __construct() {
        Sesion::exigirAdmin(); // TODAS las acciones de este controlador exigen admin
    }

    /** GET /admin/estadisticas */
    public function estadisticas(): void {
        $this->ok((new Catalogo())->estadisticas());
    }

    /** GET /admin/torneos?q= */
    public function torneos(): void {
        $this->ok((new Torneo())->listarTodos($this->query('q', '')));
    }

    /** GET /admin/torneos/pendientes */
    public function pendientes(): void {
        $this->ok((new Torneo())->pendientes());
    }

    /** PUT /admin/torneos/{id}/aprobacion   body: { aprobado: bool, motivo? } */
    public function resolverTorneo(int $id): void {
        $yo = Sesion::usuario();
        $datos = $this->cuerpo();
        $aprobado = filter_var($datos['aprobado'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $motivo = trim((string)($datos['motivo'] ?? ''));

        $torneos = new Torneo();
        $torneo = $torneos->buscar($id);
        if (!$torneo) {
            throw new HttpError(404, 'El torneo no existe.');
        }
        if ($torneo['tipo'] !== 'Formal') {
            throw new HttpError(409, 'Los torneos informales no necesitan aprobación.');
        }
        if (!$aprobado && (mb_strlen($motivo) < 5 || mb_strlen($motivo) > 255)) {
            throw new HttpError(422, 'Para rechazar tenés que escribir un motivo (5 a 255 caracteres).', ['motivo' => 'Motivo obligatorio.']);
        }

        $torneos->resolverAprobacion($id, $aprobado, (int)$yo['id_usuario'], $motivo ?: null);
        (new Notificacion())->crear((int)$torneo['id_organizador'],
            $aprobado ? 'Torneo_Aprobado' : 'Torneo_Rechazado',
            $aprobado ? "Tu torneo \"{$torneo['nombre']}\" fue aprobado. ¡Ya se pueden inscribir!"
                      : "Tu torneo \"{$torneo['nombre']}\" fue rechazado: $motivo",
            'torneo', $id);

        $this->ok(['mensaje' => $aprobado ? 'Torneo aprobado.' : 'Torneo rechazado.']);
    }

    /** GET /admin/usuarios?q=&pagina= */
    public function usuarios(): void {
        $pagina = max(1, (int)$this->query('pagina', '1'));
        $this->ok((new Usuario())->listar($this->query('q', ''), $pagina));
    }

    /** PUT /admin/usuarios/{id}/estado   body: { estado: Activo|Baneado } */
    public function cambiarEstadoUsuario(int $id): void {
        $v = new Validador($this->cuerpo());
        $estado = $v->opcion('estado', 'El estado', ['Activo', 'Baneado']);
        $v->validar();

        $usuarios = new Usuario();
        if (!$usuarios->buscarPorId($id)) {
            throw new HttpError(404, 'El usuario no existe.');
        }
        if ($id === Sesion::idUsuario()) {
            throw new HttpError(409, 'No te podés banear a vos mismo.');
        }
        if ($estado === 'Baneado' && $usuarios->esAdmin($id) && $usuarios->cantidadAdmins() <= 1) {
            throw new HttpError(409, 'No se puede banear al último administrador.');
        }
        $usuarios->cambiarEstado($id, $estado);
        $this->ok(['mensaje' => "Usuario $estado."]);
    }

    /** PUT /admin/usuarios/{id}/admin   body: { es_admin: bool } */
    public function cambiarRolAdmin(int $id): void {
        $esAdmin = filter_var($this->cuerpo()['es_admin'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $usuarios = new Usuario();
        if (!$usuarios->buscarPorId($id)) {
            throw new HttpError(404, 'El usuario no existe.');
        }
        if ($esAdmin) {
            $usuarios->asignarRol($id, Usuario::ROL_ADMIN);
        } else {
            if ($usuarios->cantidadAdmins() <= 1 && $usuarios->esAdmin($id)) {
                throw new HttpError(409, 'Tiene que quedar al menos un administrador.');
            }
            $usuarios->quitarRol($id, Usuario::ROL_ADMIN);
        }
        (new Notificacion())->crear($id, 'Sistema',
            $esAdmin ? 'Ahora sos administrador de TriunfoTotal.' : 'Ya no tenés rol de administrador.');
        $this->ok(['mensaje' => 'Rol actualizado.']);
    }

    /** PUT /admin/modulos   body: { codigo, habilitado } */
    public function cambiarModulo(): void {
        $datos = $this->cuerpo();
        $v = new Validador($datos);
        $codigo = $v->opcion('codigo', 'El módulo', Torneo::FORMATOS);
        $v->validar();
        (new Catalogo())->cambiarModulo($codigo, filter_var($datos['habilitado'] ?? false, FILTER_VALIDATE_BOOLEAN));
        $this->ok((new Catalogo())->modulos());
    }

    /** GET /admin/auditoria?tabla=&accion=&usuario=&desde=&hasta=&pagina= */
    public function auditoria(): void {
        $filtros = [];
        foreach (['tabla', 'accion', 'usuario', 'desde', 'hasta'] as $c) {
            $filtros[$c] = $this->query($c);
        }
        $auditoria = new Auditoria();
        $resultado = $auditoria->listar($filtros, max(1, (int)$this->query('pagina', '1')));
        $resultado['tablas'] = $auditoria->tablas();
        $this->ok($resultado);
    }

    /** GET /admin/auditoria/csv -> descarga CSV (funcionalidad opcional "exportar datos") */
    public function auditoriaCsv(): void {
        $filtros = [];
        foreach (['tabla', 'accion', 'usuario', 'desde', 'hasta'] as $c) {
            $filtros[$c] = $this->query($c);
        }
        $datos = (new Auditoria())->listar($filtros, 1, 5000);

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="auditoria_' . date('Ymd_His') . '.csv"');
        $salida = fopen('php://output', 'w');
        fwrite($salida, "\xEF\xBB\xBF"); // BOM para que Excel respete los acentos
        fputcsv($salida, ['id', 'fecha', 'usuario', 'email', 'tabla', 'accion', 'registro', 'descripcion', 'ip']);
        foreach ($datos['registros'] as $r) {
            fputcsv($salida, [$r['id_auditoria'], $r['creado_en'], $r['usuario'], $r['email'], $r['tabla_afectada'],
                $r['accion'], $r['id_registro'], $r['descripcion'], $r['ip']]);
        }
        fclose($salida);
    }
}
