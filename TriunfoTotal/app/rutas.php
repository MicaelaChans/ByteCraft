<?php
// app/rutas.php
//
// Mapa de TODAS las rutas de la API (método + URL -> controlador@método).
// Leyendo este archivo se entiende qué puede hacer el sistema.
// Los permisos se controlan dentro de cada controlador.

/** @var Router $router */

// --- Autenticación (módulo de usuarios) -----------------------------
$router->post('auth/registro', [AuthController::class, 'registro']);
$router->post('auth/login',    [AuthController::class, 'login']);
$router->post('auth/logout',   [AuthController::class, 'logout']);
$router->get('auth/sesion',    [AuthController::class, 'sesion']);
$router->post('auth/verificar',             [AuthController::class, 'verificar']);
$router->post('auth/reenviar-verificacion', [AuthController::class, 'reenviarVerificacion']);

// --- Perfil del usuario logueado -------------------------------------
$router->put('perfil',          [PerfilController::class, 'actualizar']);
$router->put('perfil/password', [PerfilController::class, 'cambiarPassword']);
$router->get('perfil/torneos',  [PerfilController::class, 'torneos']);

// --- Perfiles públicos y seguidores ---------------------------------
$router->get('usuarios',                [UsuarioController::class, 'buscar']);
$router->get('usuarios/{id}',           [UsuarioController::class, 'perfil']);
$router->post('usuarios/{id}/seguir',   [UsuarioController::class, 'seguir']);
$router->delete('usuarios/{id}/seguir', [UsuarioController::class, 'dejarDeSeguir']);
$router->get('perfil/seguidos',         [UsuarioController::class, 'seguidos']);

// --- Catálogos (público) ---------------------------------------------
$router->get('disciplinas', [CatalogoController::class, 'disciplinas']);
$router->get('modulos',     [CatalogoController::class, 'modulos']);

// --- Torneos (consulta pública + gestión del organizador) ------------
$router->get('torneos',         [TorneoController::class, 'listar']);
$router->post('torneos',        [TorneoController::class, 'crear']);
$router->get('torneos/{id}',    [TorneoController::class, 'detalle']);
$router->put('torneos/{id}',    [TorneoController::class, 'actualizar']);
$router->delete('torneos/{id}', [TorneoController::class, 'eliminar']);

// --- Inscripciones ---------------------------------------------------
$router->post('torneos/{id}/inscripciones',             [InscripcionController::class, 'inscribir']);
$router->put('torneos/{id}/inscripciones/{equipo}',     [InscripcionController::class, 'resolver']);
$router->delete('torneos/{id}/inscripciones/{equipo}',  [InscripcionController::class, 'retirar']);

// --- Competencia: liga / eliminación / suizo + resultados ------------
$router->post('torneos/{id}/iniciar', [CompetenciaController::class, 'iniciar']);
$router->put('partidos/{id}',         [CompetenciaController::class, 'actualizarPartido']);
$router->post('rondas/{id}/cerrar',   [CompetenciaController::class, 'cerrarRonda']);

// --- Equipos y participantes -----------------------------------------
$router->get('equipos',                          [EquipoController::class, 'buscar']);
$router->get('equipos/mios',                     [EquipoController::class, 'mios']);
$router->post('equipos',                         [EquipoController::class, 'crear']);
$router->get('equipos/{id}',                     [EquipoController::class, 'detalle']);
$router->put('equipos/{id}',                     [EquipoController::class, 'renombrar']);
$router->delete('equipos/{id}',                  [EquipoController::class, 'eliminar']);
$router->post('equipos/{id}/invitaciones',       [EquipoController::class, 'invitar']);
$router->delete('equipos/{id}/invitaciones/{usuario}', [EquipoController::class, 'cancelarInvitacion']);
$router->get('invitaciones',                     [EquipoController::class, 'invitacionesRecibidas']);
$router->put('invitaciones/{equipo}',            [EquipoController::class, 'responderInvitacion']);
$router->delete('equipos/{id}/miembros/{usuario}', [EquipoController::class, 'quitarMiembro']);

// --- Notificaciones ---------------------------------------------------
$router->get('notificaciones',              [NotificacionController::class, 'listar']);
$router->put('notificaciones/leer-todas',   [NotificacionController::class, 'marcarTodas']);
$router->put('notificaciones/{id}/leida',   [NotificacionController::class, 'marcarLeida']);

// --- Administración del sistema (solo Administrador) ----------------
$router->get('admin/estadisticas',            [AdminController::class, 'estadisticas']);
$router->get('admin/torneos',                 [AdminController::class, 'torneos']);
$router->get('admin/torneos/pendientes',      [AdminController::class, 'pendientes']);
$router->put('admin/torneos/{id}/aprobacion', [AdminController::class, 'resolverTorneo']);
$router->get('admin/usuarios',                [AdminController::class, 'usuarios']);
$router->put('admin/usuarios/{id}/estado',    [AdminController::class, 'cambiarEstadoUsuario']);
$router->put('admin/usuarios/{id}/admin',     [AdminController::class, 'cambiarRolAdmin']);
$router->put('admin/usuarios/{id}/verificar', [AdminController::class, 'verificarEmail']);
$router->put('admin/modulos',                 [AdminController::class, 'cambiarModulo']);
$router->get('admin/auditoria',               [AdminController::class, 'auditoria']);
$router->get('admin/auditoria/csv',           [AdminController::class, 'auditoriaCsv']);
