<?php
// =====================================================================
//  database/generar_datos_prueba.php
//
//  Genera los datos de prueba (+50 registros por componente) USANDO LOS
//  MISMOS MODELOS Y MÓDULOS de la aplicación. Así los fixtures, llaves,
//  rondas suizas y posiciones de prueba son 100% coherentes.
//
//  Uso (sobre una base recién creada con 01_esquema.sql + 03_logica.sql):
//     DB_HOST=... DB_USER=... DB_PASS=... php database/generar_datos_prueba.php
//  Después se exporta con:  database/exportar_datos_prueba.sh
//
//  Contraseñas de prueba:
//     admin@triunfototal.com          -> Admin1234        (Administrador)
//     pablo.admin@triunfototal.com    -> PabloAdmin1234   (Administrador)
//     micaela.admin@triunfototal.com  -> MicaAdmin1234    (Administrador)
//     federico.admin@triunfototal.com -> FedeAdmin1234    (Administrador)
//     claudio.admin@triunfototal.com  -> ClaudioAdmin1234 (Administrador)
//     resto de los usuarios           -> Prueba1234
// =====================================================================

if (PHP_SAPI !== 'cli') {
    exit('Solo se ejecuta por consola.');
}

require_once __DIR__ . '/../app/core/App.php';
mt_srand(2026); // semilla fija: siempre genera los mismos datos

$db = Conexion::getConexion();
$usuarios = new Usuario();
$equipos = new Equipo();
$torneos = new Torneo();
$inscripciones = new Inscripcion();
$partidos = new Partido();
$notif = new Notificacion();

function como(int $idUsuario): void {
    Conexion::setContextoAuditoria($idUsuario, '192.168.10.' . mt_rand(10, 200));
}
function elegir(array $a) { return $a[array_rand($a)]; }

// ---------------------------------------------------------------------
// 1) USUARIOS (62)
// ---------------------------------------------------------------------
$nombres = ['Pablo', 'Claudio', 'Micaela', 'Federico', 'Lucía', 'Martín', 'Sofía', 'Joaquín', 'Valentina', 'Diego',
    'Camila', 'Santiago', 'Florencia', 'Matías', 'Agustina', 'Nicolás', 'Carolina', 'Facundo', 'Romina', 'Gonzalo',
    'Victoria', 'Bruno', 'Natalia', 'Rodrigo', 'Julieta', 'Emiliano', 'Paula', 'Sebastián', 'Belén', 'Gastón'];
$apellidos = ['Ávila', 'Fernández', 'Chans', 'Canabarro', 'Rodríguez', 'González', 'Pereira', 'Silva', 'Martínez',
    'Suárez', 'Sosa', 'López', 'Díaz', 'Castro', 'Núñez', 'Olivera', 'Méndez', 'Cabrera', 'Ramos', 'Acosta'];

Conexion::setContextoAuditoria(null, '127.0.0.1');
// Los 5 administradores del sistema (cuenta general + integrantes de ByteCraft)
$admins = [
    ['Administrador', 'General', 'admin@triunfototal.com', 'Admin1234'],
    ['Pablo', 'Ávila', 'pablo.admin@triunfototal.com', 'PabloAdmin1234'],
    ['Micaela', 'Chans', 'micaela.admin@triunfototal.com', 'MicaAdmin1234'],
    ['Federico', 'Canabarro', 'federico.admin@triunfototal.com', 'FedeAdmin1234'],
    ['Claudio', 'Fernández', 'claudio.admin@triunfototal.com', 'ClaudioAdmin1234'],
];
foreach ($admins as $i => [$n, $a, $email, $clave]) {
    $id = $usuarios->registrar($n, $a, $email, $clave);
    $usuarios->asignarRol($id, Usuario::ROL_ADMIN);
    if ($i === 0) {
        $idAdmin = $id; // el admin general es quien aprueba los torneos de prueba
    }
}
$idCarlos = $usuarios->registrar('Carlos', 'Organizador', 'carlos@triunfototal.com', 'Prueba1234');

$idsUsuarios = [$idCarlos];
for ($i = 1; $i <= 59; $i++) {
    $n = $nombres[($i - 1) % count($nombres)];
    $a = $apellidos[($i * 7) % count($apellidos)];
    $email = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', "$n.$a$i")) . '@correo.com.uy';
    $id = $usuarios->registrar($n, $a, $email, 'Prueba1234');
    como($id);
    $usuarios->actualizarPerfil($id, [
        'nombre' => $n, 'apellido' => $a,
        'alias' => strtolower(iconv('UTF-8', 'ASCII//TRANSLIT', $n)) . '_' . $i,
        'telefono' => '09' . mt_rand(1000000, 9999999),
        'direccion' => elegir(['Av. 18 de Julio', 'Bv. Artigas', 'Rambla Sur', 'Av. Italia', 'Calle Rivera']) . ' ' . mt_rand(100, 3999),
        'avatar' => null,
    ]);
    $idsUsuarios[] = $id;
}
// Algunos baneados para probar el panel
foreach ([$idsUsuarios[57], $idsUsuarios[58]] as $id) {
    como($idAdmin);
    $usuarios->cambiarEstado($id, 'Baneado');
}
$activos = array_slice($idsUsuarios, 0, 57);
echo 'Usuarios: ' . (count($idsUsuarios) + count($admins)) . PHP_EOL;

// ---------------------------------------------------------------------
// 2) EQUIPOS (60 de 3-5 integrantes) + participantes individuales
// ---------------------------------------------------------------------
$prefijos = ['Los Halcones', 'Furia Roja', 'Los Tácticos', 'Team Vórtice', 'Club Atlético Central', 'Deportivo Norte',
    'Real Malvín', 'Unión del Cerro', 'Los Galácticos', 'Dream Team', 'Tormenta Celeste', 'Pumas del Sur',
    'Cóndores', 'Leones de Pocitos', 'Los Pibes', 'Rayo Oriental', 'Atlético Prado', 'Fénix Gamers', 'Barrio FC', 'Titanes'];
$idsEquipos = [];
for ($i = 0; $i < 60; $i++) {
    $capitan = $activos[$i % count($activos)];
    como($capitan);
    $nombre = $prefijos[$i % count($prefijos)] . ($i >= 20 ? ' ' . intdiv($i, 20) + 1 : '');
    $idE = $equipos->crear($nombre, $capitan);
    $miembros = array_rand(array_flip($activos), mt_rand(3, 5));
    foreach ((array)$miembros as $m) {
        if (!$equipos->esMiembro($idE, $m)) {
            $equipos->agregarMiembro($idE, $m);
        }
    }
    $idsEquipos[] = $idE;
}
// Invitaciones a equipos (55): algunas pendientes, otras aceptadas o rechazadas
$invitaciones = new Invitacion();
$creadas = 0;
while ($creadas < 55) {
    $idE = elegir($idsEquipos);
    $invitado = elegir($activos);
    if ($equipos->esMiembro($idE, $invitado) || $invitaciones->buscar($idE, $invitado)) {
        continue;
    }
    $capitan = (int)$db->query("SELECT id_usuario FROM equipo_miembros WHERE id_equipo = $idE AND rol_en_equipo = 'Capitan'")->fetchColumn();
    como($capitan);
    $invitaciones->crear($idE, $invitado, $capitan);
    $estado = ['Pendiente', 'Pendiente', 'Aceptada', 'Rechazada'][$creadas % 4];
    if ($estado === 'Pendiente') {
        $notif->crear($invitado, 'Invitacion_Equipo', 'Te invitaron a unirte a un equipo.', 'equipo', $idE);
    } else {
        como($invitado);
        $invitaciones->cambiarEstado($idE, $invitado, $estado);
        if ($estado === 'Aceptada') {
            $equipos->agregarMiembro($idE, $invitado);
        }
    }
    $creadas++;
}

$idsIndividuales = [];
foreach (array_slice($activos, 0, 40) as $u) {
    $idsIndividuales[] = $equipos->individualDe($u);
}
echo 'Equipos: ' . count($idsEquipos) . ' + ' . count($idsIndividuales) . " individuales\n";

// ---------------------------------------------------------------------
// 3) TORNEOS (56) en todos los estados posibles
// ---------------------------------------------------------------------
$disciplinas = [1 => 'Fútbol', 2 => 'Futsal', 3 => 'Voleibol', 4 => 'Ajedrez', 5 => 'eSports', 6 => 'Kayak', 7 => 'Esquí', 8 => 'Tenis de Mesa'];
$nombresTorneo = ['Copa Primavera', 'Liga Barrial', 'Torneo Relámpago', 'Copa Invierno', 'Abierto UTU', 'Copa Arias-Balparda',
    'Liga Nocturna', 'Torneo Aniversario', 'Copa Integración', 'Desafío Interliceal', 'Master Series', 'Clásico de Verano',
    'Copa de Campeones', 'Gran Prix', 'Torneo Solidario'];

/** Juega rondas al azar. $rondasAJugar = null juega todo. */
function jugar(int $idTorneo, ?int $rondasAJugar = null): void {
    $partidos = new Partido();
    $rondas = new Ronda();
    $t = (new Torneo())->buscar($idTorneo);
    $modulo = ModuloCompetencia::para($t['formato']);
    $jugadas = 0;
    while ($t['estado_torneo'] === 'En Proceso' && ($rondasAJugar === null || $jugadas < $rondasAJugar)) {
        $abiertas = array_filter($rondas->deTorneo($idTorneo), fn($r) => $r['estado'] === 'Abierta');
        if (!$abiertas) break;
        $ronda = reset($abiertas);
        foreach ($partidos->deRonda((int)$ronda['id_ronda']) as $p) {
            if ($p['estado'] === 'Finalizado') continue;
            $gl = mt_rand(0, 4); $gv = mt_rand(0, 4);
            if (!$modulo->permiteEmpates() && $gl === $gv) $gl++;
            $fecha = date('Y-m-d H:i:s', strtotime('-' . mt_rand(1, 60) . ' days ' . mt_rand(9, 21) . ':00'));
            $partidos->guardarResultado((int)$p['id_partido'], $gl, $gv, 'Finalizado', $fecha);
        }
        $rondas->cerrar((int)$ronda['id_ronda']);
        $paso = $modulo->siguientePaso($t);
        if ($paso['finalizado']) {
            (new Torneo())->cambiarEstado($idTorneo, 'Finalizado', $paso['id_campeon']);
        }
        $t = (new Torneo())->buscar($idTorneo);
        $jugadas++;
    }
}

$creados = 0;
for ($i = 0; $i < 56; $i++) {
    $org = $i < 6 ? $idCarlos : $activos[mt_rand(1, count($activos) - 1)];
    como($org);
    $idDisc = ($i % 8) + 1;
    $individual = in_array($idDisc, [4, 5, 6, 7, 8], true) && $i % 3 !== 0;
    $formato = ['Liga', 'Eliminacion', 'Suizo'][$i % 3];
    $tipo = $i % 4 === 0 ? 'Formal' : 'Informal';
    $max = elegir([4, 6, 8, 8, 10, 16]);
    $inicio = date('Y-m-d', strtotime(mt_rand(-90, 60) . ' days'));

    $id = $torneos->crear($org, [
        'id_disciplina' => $idDisc,
        'nombre' => $nombresTorneo[$i % count($nombresTorneo)] . ' ' . $disciplinas[$idDisc] . ' ' . (2026 + intdiv($i, 30)),
        'descripcion' => "Torneo de {$disciplinas[$idDisc]} en formato " . ['Liga' => 'liga todos contra todos',
            'Eliminacion' => 'eliminación directa', 'Suizo' => 'sistema suizo'][$formato] . '. Datos de prueba generados automáticamente.',
        'formato' => $formato,
        'modalidad' => $individual ? 'Individual' : 'Equipos',
        'tipo' => $tipo,
        'max_equipos' => $max,
        'puntos_victoria' => $idDisc === 4 ? 2 : 3,
        'puntos_empate' => 1,
        'puntos_derrota' => 0,
        'ida_y_vuelta' => $formato === 'Liga' && $i % 5 === 0 ? 1 : 0,
        'rondas_suizo' => null,
        'fecha_inicio' => $inicio,
        'fecha_fin' => date('Y-m-d', strtotime($inicio . ' +' . mt_rand(10, 60) . ' days')),
    ]);
    $creados++;

    // Formales: el admin aprueba la mayoría, rechaza algunos y deja otros pendientes
    if ($tipo === 'Formal') {
        como($idAdmin);
        $r = $i % 16;
        if ($r === 4) {
            $torneos->resolverAprobacion($id, false, $idAdmin, 'Faltan datos del reglamento y la sede.');
            $notif->crear($org, 'Torneo_Rechazado', 'Tu torneo fue rechazado: faltan datos del reglamento.', 'torneo', $id);
            continue;
        }
        if ($r === 8) {
            continue; // queda Pendiente
        }
        $torneos->resolverAprobacion($id, true, $idAdmin, null);
        $notif->crear($org, 'Torneo_Aprobado', 'Tu torneo fue aprobado.', 'torneo', $id);
    }

    // Inscripciones
    $pool = $individual ? $idsIndividuales : $idsEquipos;
    shuffle($pool);
    $cantidad = min($max, count($pool), mt_rand(max(3, intdiv($max, 2)), $max));
    foreach (array_slice($pool, 0, $cantidad) as $idEquipo) {
        $inscripciones->crear($id, $idEquipo, 'Aceptada');
        $notif->aEquipo($idEquipo, 'Inscripcion_Aceptada', 'Te aceptaron en un torneo.', 'torneo', $id);
    }
    // Un par de solicitudes pendientes/rechazadas
    foreach (array_slice($pool, $cantidad, 2) as $k => $idEquipo) {
        $inscripciones->crear($id, $idEquipo, $k === 0 ? 'Pendiente' : 'Rechazada');
        $notif->crear($org, 'Solicitud_Inscripcion', 'Nueva solicitud de inscripción.', 'torneo', $id);
    }

    // Estado del torneo: 1/3 sin empezar, 1/3 en proceso, 1/3 finalizados
    $etapa = $i % 9 < 3 ? 'borrador' : ($i % 9 < 6 ? 'proceso' : 'final');
    if ($etapa === 'borrador') {
        continue;
    }
    $modulo = ModuloCompetencia::para($formato);
    $aceptados = $inscripciones->aceptados($id);
    if (count($aceptados) < $modulo->minimoParticipantes()) {
        continue;
    }
    $t = $torneos->buscar($id);
    foreach ($inscripciones->deTorneo($id) as $ins) {
        if ($ins['estado_inscripcion'] === 'Pendiente') {
            $inscripciones->cambiarEstado($id, (int)$ins['id_equipo'], 'Rechazada');
        }
    }
    $modulo->iniciar($t, $aceptados);
    $torneos->cambiarEstado($id, 'En Proceso');
    (new Posicion())->recalcular($id);
    jugar($id, $etapa === 'proceso' ? 1 : null);
}
echo "Torneos: $creados\n";

// ---------------------------------------------------------------------
// 4) SEGUIDORES (60) y algunos intentos de login fallidos (para el panel)
// ---------------------------------------------------------------------
// Carlos (organizador de varios torneos) tiene 15 seguidores fijos: sirve para la demo
foreach (array_slice($activos, 1, 15) as $fan) {
    como($fan);
    $db->prepare('INSERT IGNORE INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)')->execute([$fan, $idCarlos]);
}
$seg = 0;
while ($seg < 60) {
    $a = elegir($activos); $b = elegir($activos);
    if ($a === $b) continue;
    $st = $db->prepare('INSERT IGNORE INTO seguidores (id_seguidor, id_seguido) VALUES (?, ?)');
    $st->execute([$a, $b]);
    if ($st->rowCount()) {
        $notif->crear($b, 'Nuevo_Seguidor', 'Tenés un nuevo seguidor.', 'usuario', $a);
        $seg++;
    }
}
// Fechados entre 1 y 72 horas atrás: así aparecen en el panel pero NO dejan
// bloqueada ninguna cuenta (el bloqueo solo mira los últimos 15 minutos).
$stIntento = $db->prepare('INSERT INTO intentos_login (email, ip, exito, creado_en) VALUES (?, ?, 0, NOW() - INTERVAL ? MINUTE)');
for ($i = 0; $i < 55; $i++) {
    $stIntento->execute([elegir(['admin@triunfototal.com', 'carlos@triunfototal.com', 'noexiste@correo.com']),
        '203.0.113.' . mt_rand(1, 254), mt_rand(60, 72 * 60)]);
}

// Resumen
foreach (['usuarios', 'usuario_roles', 'equipos', 'equipo_miembros', 'equipo_invitaciones', 'torneos', 'torneo_equipos', 'rondas',
          'partidos', 'posiciones', 'notificaciones', 'seguidores', 'intentos_login', 'auditoria'] as $tabla) {
    printf("  %-16s %5d\n", $tabla, $db->query("SELECT COUNT(*) FROM $tabla")->fetchColumn());
}
