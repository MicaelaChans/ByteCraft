-- =====================================================================
--  TriunfoTotal — SGDM (Sistema de Gestión Deportiva Modular)
--  01_esquema.sql — Estructura de la base (DDL)
--
--  Orden de instalación:
--    01_esquema.sql        -> tablas, claves, vistas (este archivo)
--    02_datos_prueba.sql   -> datos de prueba (50+ registros por tabla)
--    03_logica.sql         -> procedimientos y triggers (auditoría, aprobación, posiciones)
--    04_dcl.sh             -> usuarios de la base y permisos (DCL)
--
--  Modelo en 3FN. Decisiones importantes:
--   * Roles dinámicos: usuario_roles + roles. "Organizador" NO es un rol,
--     es ser el dueño (torneos.id_organizador) de un torneo puntual.
--   * Un participante individual (ajedrez, e-sports 1v1) se modela como
--     un equipo de un solo integrante: así liga/eliminación/suizo usan
--     la misma tabla de partidos para cualquier disciplina.
--   * Los formatos de competencia son "módulos" que el admin puede
--     habilitar o deshabilitar (tabla modulos).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS triunfo_total_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE triunfo_total_db;

DROP VIEW IF EXISTS v_torneos_publicos;
DROP VIEW IF EXISTS v_posiciones;
DROP TABLE IF EXISTS intentos_login, auditoria, notificaciones, seguidores,
  posiciones, partidos, rondas, torneo_equipos, equipo_miembros, equipos,
  torneos, modulos, disciplinas, usuario_roles, roles, usuarios;

-- ---------------------------------------------------------------------
-- Usuarios y roles
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  apellido       VARCHAR(100) DEFAULT NULL,
  alias          VARCHAR(50)  DEFAULT NULL,
  email          VARCHAR(150) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL COMMENT 'bcrypt (password_hash de PHP), nunca texto plano',
  telefono       VARCHAR(20)  DEFAULT NULL,
  direccion      VARCHAR(255) DEFAULT NULL,
  avatar         MEDIUMTEXT   DEFAULT NULL COMMENT 'imagen en base64 (data URL), máx ~2MB',
  estado         ENUM('Activo','Baneado') NOT NULL DEFAULT 'Activo',
  -- Verificación de email: hasta confirmar el link que llega por correo no puede iniciar sesión
  email_verificado        TINYINT(1) NOT NULL DEFAULT 0,
  token_verificacion      CHAR(64) DEFAULT NULL COMMENT 'hash SHA-256 del token (nunca el token en claro)',
  token_expira            DATETIME DEFAULT NULL,
  verificacion_enviada_en DATETIME DEFAULT NULL COMMENT 'para limitar los reenvíos',
  creado_en      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_token (token_verificacion),
  UNIQUE KEY uq_usuarios_alias (alias)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id_rol      INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol  VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  UNIQUE KEY uq_roles_nombre (nombre_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuario_roles (
  id_usuario  INT NOT NULL,
  id_rol      INT NOT NULL,
  asignado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_rol),
  CONSTRAINT fk_usuariorol_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_usuariorol_rol     FOREIGN KEY (id_rol)     REFERENCES roles (id_rol)        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Catálogos: disciplinas y módulos de competencia
-- ---------------------------------------------------------------------
CREATE TABLE disciplinas (
  id_disciplina INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL,
  categoria     ENUM('Deporte','Mental','Electrónico') NOT NULL DEFAULT 'Deporte',
  imagen        VARCHAR(150) DEFAULT '/img/futbol.jpg',
  UNIQUE KEY uq_disciplinas_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE modulos (
  codigo      ENUM('Liga','Eliminacion','Suizo') PRIMARY KEY,
  nombre      VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  habilitado  TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Torneos
-- ---------------------------------------------------------------------
CREATE TABLE torneos (
  id_torneo          INT AUTO_INCREMENT PRIMARY KEY,
  id_organizador     INT NOT NULL,
  id_disciplina      INT NOT NULL,
  nombre             VARCHAR(100) NOT NULL,
  descripcion        TEXT DEFAULT NULL,
  formato            ENUM('Liga','Eliminacion','Suizo') NOT NULL,
  modalidad          ENUM('Individual','Equipos') NOT NULL DEFAULT 'Equipos',
  tipo               ENUM('Informal','Formal') NOT NULL DEFAULT 'Informal',
  max_equipos        INT NOT NULL DEFAULT 16,
  puntos_victoria    TINYINT NOT NULL DEFAULT 3,
  puntos_empate      TINYINT NOT NULL DEFAULT 1,
  puntos_derrota     TINYINT NOT NULL DEFAULT 0,
  ida_y_vuelta       TINYINT(1) NOT NULL DEFAULT 0,
  rondas_suizo       TINYINT DEFAULT NULL COMMENT 'Si es NULL se calcula como ceil(log2(n))',
  fecha_inicio       DATE DEFAULT NULL,
  fecha_fin          DATE DEFAULT NULL,
  estado_aprobacion  ENUM('Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  motivo_rechazo     VARCHAR(255) DEFAULT NULL,
  id_aprobador       INT DEFAULT NULL,
  fecha_aprobacion   DATETIME DEFAULT NULL,
  estado_torneo      ENUM('Borrador','En Proceso','Finalizado') NOT NULL DEFAULT 'Borrador',
  id_campeon         INT DEFAULT NULL,
  creado_en          DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_torneos_estado (estado_aprobacion, estado_torneo),
  CONSTRAINT fk_torneos_organizador FOREIGN KEY (id_organizador) REFERENCES usuarios (id_usuario) ON UPDATE CASCADE,
  CONSTRAINT fk_torneos_aprobador   FOREIGN KEY (id_aprobador)   REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_torneos_disciplina  FOREIGN KEY (id_disciplina)  REFERENCES disciplinas (id_disciplina) ON UPDATE CASCADE,
  CONSTRAINT fk_torneos_modulo      FOREIGN KEY (formato)        REFERENCES modulos (codigo) ON UPDATE CASCADE,
  CONSTRAINT chk_torneos_max        CHECK (max_equipos BETWEEN 2 AND 128),
  CONSTRAINT chk_torneos_fechas     CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Equipos / participantes
-- ---------------------------------------------------------------------
CREATE TABLE equipos (
  id_equipo     INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  es_individual TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = participante individual (equipo de 1)',
  id_creador    INT DEFAULT NULL,
  creado_en     DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_equipos_creador FOREIGN KEY (id_creador) REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE equipo_miembros (
  id_equipo     INT NOT NULL,
  id_usuario    INT NOT NULL,
  rol_en_equipo ENUM('Capitan','Jugador') NOT NULL DEFAULT 'Jugador',
  PRIMARY KEY (id_equipo, id_usuario),
  CONSTRAINT fk_eqmiembros_equipo  FOREIGN KEY (id_equipo)  REFERENCES equipos (id_equipo)   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_eqmiembros_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE torneo_equipos (
  id_torneo          INT NOT NULL,
  id_equipo          INT NOT NULL,
  estado_inscripcion ENUM('Pendiente','Aceptada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  fecha_inscripcion  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_torneo, id_equipo),
  CONSTRAINT fk_tequipos_torneo FOREIGN KEY (id_torneo) REFERENCES torneos (id_torneo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tequipos_equipo FOREIGN KEY (id_equipo) REFERENCES equipos (id_equipo) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE torneos
  ADD CONSTRAINT fk_torneos_campeon FOREIGN KEY (id_campeon) REFERENCES equipos (id_equipo) ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Rondas, partidos (enfrentamientos + resultado) y posiciones
-- ---------------------------------------------------------------------
CREATE TABLE rondas (
  id_ronda     INT AUTO_INCREMENT PRIMARY KEY,
  id_torneo    INT NOT NULL,
  numero       INT NOT NULL,
  nombre       VARCHAR(50) DEFAULT NULL COMMENT 'Ej: Jornada 3, Semifinal, Ronda suiza 2',
  estado       ENUM('Pendiente','Abierta','Cerrada') NOT NULL DEFAULT 'Abierta',
  fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre DATETIME DEFAULT NULL,
  UNIQUE KEY uq_torneo_numero (id_torneo, numero),
  CONSTRAINT fk_rondas_torneo FOREIGN KEY (id_torneo) REFERENCES torneos (id_torneo) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE partidos (
  id_partido       INT AUTO_INCREMENT PRIMARY KEY,
  id_torneo        INT NOT NULL,
  id_ronda         INT DEFAULT NULL,
  id_equipo_local  INT NOT NULL,
  id_equipo_visita INT DEFAULT NULL COMMENT 'NULL = BYE (pasa directo / descansa y suma victoria)',
  goles_local      INT DEFAULT NULL,
  goles_visita     INT DEFAULT NULL,
  estado           ENUM('Pendiente','Jugando','Finalizado') NOT NULL DEFAULT 'Pendiente',
  fecha_partido    DATETIME DEFAULT NULL,
  KEY idx_partidos_torneo (id_torneo, estado),
  CONSTRAINT fk_partidos_torneo FOREIGN KEY (id_torneo)        REFERENCES torneos (id_torneo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_partidos_ronda  FOREIGN KEY (id_ronda)         REFERENCES rondas (id_ronda)   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_partidos_local  FOREIGN KEY (id_equipo_local)  REFERENCES equipos (id_equipo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_partidos_visita FOREIGN KEY (id_equipo_visita) REFERENCES equipos (id_equipo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_partidos_goles CHECK ((goles_local IS NULL OR goles_local >= 0) AND (goles_visita IS NULL OR goles_visita >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posiciones (
  id_torneo        INT NOT NULL,
  id_equipo        INT NOT NULL,
  puntos           INT NOT NULL DEFAULT 0,
  partidos_jugados INT NOT NULL DEFAULT 0,
  ganados          INT NOT NULL DEFAULT 0,
  empatados        INT NOT NULL DEFAULT 0,
  perdidos         INT NOT NULL DEFAULT 0,
  goles_favor      INT NOT NULL DEFAULT 0,
  goles_contra     INT NOT NULL DEFAULT 0,
  diferencia_goles INT NOT NULL DEFAULT 0,
  actualizado_en   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_torneo, id_equipo),
  CONSTRAINT fk_posiciones_torneo FOREIGN KEY (id_torneo) REFERENCES torneos (id_torneo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_posiciones_equipo FOREIGN KEY (id_equipo) REFERENCES equipos (id_equipo) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Social, notificaciones, auditoría y seguridad
-- ---------------------------------------------------------------------
CREATE TABLE seguidores (
  id_seguidor INT NOT NULL,
  id_seguido  INT NOT NULL,
  creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_seguidor, id_seguido),
  CONSTRAINT fk_seguidores_seguidor FOREIGN KEY (id_seguidor) REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_seguidores_seguido  FOREIGN KEY (id_seguido)  REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT NOT NULL,
  tipo            ENUM('Solicitud_Inscripcion','Inscripcion_Aceptada','Inscripcion_Rechazada','Torneo_Aprobado','Torneo_Rechazado','Nuevo_Seguidor','Partido_Programado','Resultado_Actualizado','Sistema') NOT NULL,
  referencia_tipo VARCHAR(30) DEFAULT NULL,
  referencia_id   INT DEFAULT NULL,
  mensaje         VARCHAR(255) NOT NULL,
  leida           TINYINT(1) NOT NULL DEFAULT 0,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notificaciones_usuario_leida (id_usuario, leida),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de TODO cambio en la base (lo llenan los triggers de 03_logica.sql).
-- La app solo puede leer e insertar acá (ver 04_dcl.sh): nadie puede "borrar huellas".
CREATE TABLE auditoria (
  id_auditoria   BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT DEFAULT NULL COMMENT 'quién hizo el cambio (variable @app_id_usuario)',
  tabla_afectada VARCHAR(60) NOT NULL,
  accion         ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGIN_FALLIDO','LOGOUT') NOT NULL,
  id_registro    VARCHAR(60) DEFAULT NULL,
  descripcion    TEXT DEFAULT NULL,
  ip             VARCHAR(45) DEFAULT NULL,
  creado_en      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auditoria_fecha (creado_en),
  KEY idx_auditoria_tabla (tabla_afectada, accion),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Protección contra fuerza bruta en el login (OWASP A07)
CREATE TABLE intentos_login (
  id_intento BIGINT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(150) NOT NULL,
  ip         VARCHAR(45) NOT NULL,
  exito      TINYINT(1) NOT NULL DEFAULT 0,
  creado_en  DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_intentos_email_fecha (email, creado_en),
  KEY idx_intentos_ip_fecha (ip, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Vistas (consultas de solo lectura reutilizables)
-- ---------------------------------------------------------------------
CREATE VIEW v_torneos_publicos AS
SELECT t.id_torneo, t.nombre, t.descripcion, t.formato, t.modalidad, t.tipo,
       t.estado_torneo, t.estado_aprobacion, t.max_equipos, t.fecha_inicio, t.fecha_fin,
       t.id_organizador, t.creado_en,
       d.id_disciplina, d.nombre AS disciplina, d.categoria, d.imagen,
       CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS organizador,
       (SELECT COUNT(*) FROM torneo_equipos te
         WHERE te.id_torneo = t.id_torneo AND te.estado_inscripcion = 'Aceptada') AS inscriptos
FROM torneos t
JOIN disciplinas d ON d.id_disciplina = t.id_disciplina
JOIN usuarios u    ON u.id_usuario    = t.id_organizador;

CREATE VIEW v_posiciones AS
SELECT p.*, e.nombre AS equipo
FROM posiciones p
JOIN equipos e ON e.id_equipo = p.id_equipo;

-- ---------------------------------------------------------------------
-- Datos base imprescindibles (catálogos)
-- ---------------------------------------------------------------------
INSERT INTO roles (id_rol, nombre_rol, descripcion) VALUES
 (1, 'Administrador', 'Aprueba o rechaza torneos formales y gestiona el sistema'),
 (2, 'Usuario', 'Puede organizar y/o participar en torneos de cualquier disciplina');

INSERT INTO modulos (codigo, nombre, descripcion) VALUES
 ('Liga',        'Liga (todos contra todos)', 'Fixture por método del círculo, opcional ida y vuelta'),
 ('Eliminacion', 'Eliminación directa',       'Llaves con BYE si no es potencia de 2; el que pierde queda afuera'),
 ('Suizo',       'Sistema suizo',             'Emparejamiento por puntaje acumulado, sin repetir rivales');

INSERT INTO disciplinas (id_disciplina, nombre, categoria, imagen) VALUES
 (1, 'Fútbol',        'Deporte',     '/img/futbol.jpg'),
 (2, 'Futsal',        'Deporte',     '/img/Futsal.jpg'),
 (3, 'Voleibol',      'Deporte',     '/img/voleibol.webp'),
 (4, 'Ajedrez',       'Mental',      '/img/ajedrez.webp'),
 (5, 'eSports',       'Electrónico', '/img/Esport.png'),
 (6, 'Kayak',         'Deporte',     '/img/Kayak-Profile.webp'),
 (7, 'Esquí',         'Deporte',     '/img/esqui.jpg'),
 (8, 'Tenis de Mesa', 'Deporte',     '/img/futbol.jpg');

SET FOREIGN_KEY_CHECKS = 1;
