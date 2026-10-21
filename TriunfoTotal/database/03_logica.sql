-- =====================================================================
--  03_logica.sql — Lógica dentro de la base: procedimientos y triggers
--
--  La app (PHP) ejecuta, al abrir cada conexión:
--     SET @app_id_usuario = <id del usuario logueado o NULL>,
--         @app_ip         = <IP del cliente>;
--  Los triggers de auditoría leen esas variables para registrar
--  QUIÉN hizo cada cambio y DESDE DÓNDE. Así se cumple el requisito
--  "deberá quedar registrado cualquier cambio en la Base de Datos".
-- =====================================================================
USE triunfo_total_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- Procedimiento: recalcula TODA la tabla de posiciones de un torneo
-- usando los puntos configurados en ese torneo (victoria/empate/derrota).
-- Se recalcula desde cero, así corregir un resultado nunca duplica puntos.
-- Un partido con id_equipo_visita NULL es un BYE: suma como victoria.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_recalcular_posiciones$$
CREATE PROCEDURE sp_recalcular_posiciones(IN p_torneo INT)
BEGIN
  DECLARE v_pv INT DEFAULT 3;
  DECLARE v_pe INT DEFAULT 1;
  DECLARE v_pd INT DEFAULT 0;

  SELECT puntos_victoria, puntos_empate, puntos_derrota
    INTO v_pv, v_pe, v_pd
    FROM torneos WHERE id_torneo = p_torneo;

  -- Cada equipo aceptado tiene su fila (aunque todavía no haya jugado)
  INSERT IGNORE INTO posiciones (id_torneo, id_equipo)
    SELECT id_torneo, id_equipo FROM torneo_equipos
     WHERE id_torneo = p_torneo AND estado_inscripcion = 'Aceptada';

  UPDATE posiciones p
  JOIN (
    SELECT eq.id_equipo,
           COUNT(*) AS pj,
           SUM(eq.gf > eq.gc OR eq.bye) AS g,
           SUM(eq.gf = eq.gc AND NOT eq.bye) AS e,
           SUM(eq.gf < eq.gc AND NOT eq.bye) AS d,
           SUM(eq.gf) AS gf,
           SUM(eq.gc) AS gc
    FROM (
      SELECT id_equipo_local AS id_equipo,
             COALESCE(goles_local, 0) AS gf, COALESCE(goles_visita, 0) AS gc,
             (id_equipo_visita IS NULL) AS bye
        FROM partidos WHERE id_torneo = p_torneo AND estado = 'Finalizado'
      UNION ALL
      SELECT id_equipo_visita, COALESCE(goles_visita, 0), COALESCE(goles_local, 0), 0
        FROM partidos WHERE id_torneo = p_torneo AND estado = 'Finalizado'
                        AND id_equipo_visita IS NOT NULL
    ) eq
    GROUP BY eq.id_equipo
  ) r ON r.id_equipo = p.id_equipo
  SET p.partidos_jugados = r.pj,
      p.ganados = r.g, p.empatados = r.e, p.perdidos = r.d,
      p.goles_favor = r.gf, p.goles_contra = r.gc,
      p.diferencia_goles = r.gf - r.gc,
      p.puntos = r.g * v_pv + r.e * v_pe + r.d * v_pd
  WHERE p.id_torneo = p_torneo;

  -- Equipos que ya no tienen partidos finalizados (ej: se anuló un resultado)
  UPDATE posiciones p
  SET p.partidos_jugados = 0, p.ganados = 0, p.empatados = 0, p.perdidos = 0,
      p.goles_favor = 0, p.goles_contra = 0, p.diferencia_goles = 0, p.puntos = 0
  WHERE p.id_torneo = p_torneo
    AND NOT EXISTS (SELECT 1 FROM partidos pa
                     WHERE pa.id_torneo = p_torneo AND pa.estado = 'Finalizado'
                       AND (pa.id_equipo_local = p.id_equipo OR pa.id_equipo_visita = p.id_equipo));
END$$

-- ---------------------------------------------------------------------
-- Procedimiento: escribe una fila de auditoría (lo usan todos los triggers)
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_auditar$$
CREATE PROCEDURE sp_auditar(IN p_tabla VARCHAR(60), IN p_accion VARCHAR(20),
                            IN p_id VARCHAR(60), IN p_desc TEXT)
BEGIN
  INSERT INTO auditoria (id_usuario, tabla_afectada, accion, id_registro, descripcion, ip)
  VALUES (@app_id_usuario, p_tabla, p_accion, p_id, p_desc, @app_ip);
END$$

-- =====================================================================
-- TORNEOS
-- =====================================================================
DROP TRIGGER IF EXISTS trg_torneos_before_insert$$
CREATE TRIGGER trg_torneos_before_insert BEFORE INSERT ON torneos FOR EACH ROW
BEGIN
  -- Defensa en profundidad: aunque la app ya lo valida, la base tampoco
  -- deja crear torneos de un módulo deshabilitado por el admin.
  IF (SELECT habilitado FROM modulos WHERE codigo = NEW.formato) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El módulo de competencia está deshabilitado';
  END IF;

  -- Regla de negocio de roles dinámicos:
  --  Informal -> se aprueba solo. Formal -> queda Pendiente para el admin.
  IF NEW.tipo = 'Informal' THEN
    SET NEW.estado_aprobacion = 'Aprobado';
    SET NEW.fecha_aprobacion  = CURRENT_TIMESTAMP();
  ELSE
    SET NEW.estado_aprobacion = 'Pendiente';
    SET NEW.id_aprobador = NULL, NEW.fecha_aprobacion = NULL, NEW.motivo_rechazo = NULL;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_torneos_before_update$$
CREATE TRIGGER trg_torneos_before_update BEFORE UPDATE ON torneos FOR EACH ROW
BEGIN
  IF NEW.tipo <> OLD.tipo THEN
    IF NEW.tipo = 'Informal' THEN
      SET NEW.estado_aprobacion = 'Aprobado';
      SET NEW.fecha_aprobacion  = CURRENT_TIMESTAMP();
      SET NEW.motivo_rechazo    = NULL;
    ELSE
      -- Pasar a Formal SIEMPRE vuelve a requerir al admin
      SET NEW.estado_aprobacion = 'Pendiente';
      SET NEW.id_aprobador = NULL, NEW.fecha_aprobacion = NULL, NEW.motivo_rechazo = NULL;
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_torneos_ai_auditoria$$
CREATE TRIGGER trg_torneos_ai_auditoria AFTER INSERT ON torneos FOR EACH ROW
  CALL sp_auditar('torneos', 'INSERT', NEW.id_torneo,
    JSON_OBJECT('nombre', NEW.nombre, 'formato', NEW.formato, 'tipo', NEW.tipo,
                'estado_aprobacion', NEW.estado_aprobacion))$$

DROP TRIGGER IF EXISTS trg_torneos_au_auditoria$$
CREATE TRIGGER trg_torneos_au_auditoria AFTER UPDATE ON torneos FOR EACH ROW
  CALL sp_auditar('torneos', 'UPDATE', NEW.id_torneo,
    JSON_OBJECT('antes',   JSON_OBJECT('nombre', OLD.nombre, 'tipo', OLD.tipo, 'estado_aprobacion', OLD.estado_aprobacion, 'estado_torneo', OLD.estado_torneo),
                'despues', JSON_OBJECT('nombre', NEW.nombre, 'tipo', NEW.tipo, 'estado_aprobacion', NEW.estado_aprobacion, 'estado_torneo', NEW.estado_torneo)))$$

DROP TRIGGER IF EXISTS trg_torneos_ad_auditoria$$
CREATE TRIGGER trg_torneos_ad_auditoria AFTER DELETE ON torneos FOR EACH ROW
  CALL sp_auditar('torneos', 'DELETE', OLD.id_torneo, JSON_OBJECT('nombre', OLD.nombre))$$

-- =====================================================================
-- PARTIDOS: auditoría + recálculo automático de posiciones
-- =====================================================================
DROP TRIGGER IF EXISTS trg_partidos_ai$$
CREATE TRIGGER trg_partidos_ai AFTER INSERT ON partidos FOR EACH ROW
BEGIN
  CALL sp_auditar('partidos', 'INSERT', NEW.id_partido,
    JSON_OBJECT('torneo', NEW.id_torneo, 'local', NEW.id_equipo_local, 'visita', NEW.id_equipo_visita));
  IF NEW.estado = 'Finalizado' THEN
    CALL sp_recalcular_posiciones(NEW.id_torneo);
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_partidos_au$$
CREATE TRIGGER trg_partidos_au AFTER UPDATE ON partidos FOR EACH ROW
BEGIN
  CALL sp_auditar('partidos', 'UPDATE', NEW.id_partido,
    JSON_OBJECT('antes',   CONCAT(COALESCE(OLD.goles_local,'-'), '-', COALESCE(OLD.goles_visita,'-'), ' ', OLD.estado),
                'despues', CONCAT(COALESCE(NEW.goles_local,'-'), '-', COALESCE(NEW.goles_visita,'-'), ' ', NEW.estado)));
  IF NEW.estado = 'Finalizado' OR OLD.estado = 'Finalizado' THEN
    CALL sp_recalcular_posiciones(NEW.id_torneo);
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_partidos_ad$$
CREATE TRIGGER trg_partidos_ad AFTER DELETE ON partidos FOR EACH ROW
  CALL sp_auditar('partidos', 'DELETE', OLD.id_partido, JSON_OBJECT('torneo', OLD.id_torneo))$$

-- =====================================================================
-- USUARIOS (nunca se guarda el hash en la auditoría)
-- =====================================================================
DROP TRIGGER IF EXISTS trg_usuarios_ai$$
CREATE TRIGGER trg_usuarios_ai AFTER INSERT ON usuarios FOR EACH ROW
  CALL sp_auditar('usuarios', 'INSERT', NEW.id_usuario, JSON_OBJECT('email', NEW.email))$$

DROP TRIGGER IF EXISTS trg_usuarios_au$$
CREATE TRIGGER trg_usuarios_au AFTER UPDATE ON usuarios FOR EACH ROW
  CALL sp_auditar('usuarios', 'UPDATE', NEW.id_usuario,
    JSON_OBJECT('estado', CONCAT(OLD.estado, ' -> ', NEW.estado),
                'email_verificado', CONCAT(OLD.email_verificado, ' -> ', NEW.email_verificado),
                'cambio_password', OLD.password_hash <> NEW.password_hash,
                'cambio_perfil', NOT (OLD.nombre <=> NEW.nombre AND OLD.apellido <=> NEW.apellido
                                      AND OLD.alias <=> NEW.alias AND OLD.telefono <=> NEW.telefono
                                      AND OLD.direccion <=> NEW.direccion)))$$

DROP TRIGGER IF EXISTS trg_usuarios_ad$$
CREATE TRIGGER trg_usuarios_ad AFTER DELETE ON usuarios FOR EACH ROW
  CALL sp_auditar('usuarios', 'DELETE', OLD.id_usuario, JSON_OBJECT('email', OLD.email))$$

DROP TRIGGER IF EXISTS trg_usuario_roles_ai$$
CREATE TRIGGER trg_usuario_roles_ai AFTER INSERT ON usuario_roles FOR EACH ROW
  CALL sp_auditar('usuario_roles', 'INSERT', CONCAT(NEW.id_usuario, ':', NEW.id_rol), NULL)$$

DROP TRIGGER IF EXISTS trg_usuario_roles_ad$$
CREATE TRIGGER trg_usuario_roles_ad AFTER DELETE ON usuario_roles FOR EACH ROW
  CALL sp_auditar('usuario_roles', 'DELETE', CONCAT(OLD.id_usuario, ':', OLD.id_rol), NULL)$$

-- =====================================================================
-- EQUIPOS, MIEMBROS E INSCRIPCIONES
-- =====================================================================
DROP TRIGGER IF EXISTS trg_equipos_ai$$
CREATE TRIGGER trg_equipos_ai AFTER INSERT ON equipos FOR EACH ROW
  CALL sp_auditar('equipos', 'INSERT', NEW.id_equipo, JSON_OBJECT('nombre', NEW.nombre))$$

DROP TRIGGER IF EXISTS trg_equipos_au$$
CREATE TRIGGER trg_equipos_au AFTER UPDATE ON equipos FOR EACH ROW
  CALL sp_auditar('equipos', 'UPDATE', NEW.id_equipo, JSON_OBJECT('antes', OLD.nombre, 'despues', NEW.nombre))$$

DROP TRIGGER IF EXISTS trg_equipos_ad$$
CREATE TRIGGER trg_equipos_ad AFTER DELETE ON equipos FOR EACH ROW
  CALL sp_auditar('equipos', 'DELETE', OLD.id_equipo, JSON_OBJECT('nombre', OLD.nombre))$$

DROP TRIGGER IF EXISTS trg_eqmiembros_ai$$
CREATE TRIGGER trg_eqmiembros_ai AFTER INSERT ON equipo_miembros FOR EACH ROW
  CALL sp_auditar('equipo_miembros', 'INSERT', CONCAT(NEW.id_equipo, ':', NEW.id_usuario), NEW.rol_en_equipo)$$

DROP TRIGGER IF EXISTS trg_eqmiembros_ad$$
CREATE TRIGGER trg_eqmiembros_ad AFTER DELETE ON equipo_miembros FOR EACH ROW
  CALL sp_auditar('equipo_miembros', 'DELETE', CONCAT(OLD.id_equipo, ':', OLD.id_usuario), NULL)$$

DROP TRIGGER IF EXISTS trg_seguidores_ai$$
CREATE TRIGGER trg_seguidores_ai AFTER INSERT ON seguidores FOR EACH ROW
  CALL sp_auditar('seguidores', 'INSERT', CONCAT(NEW.id_seguidor, '->', NEW.id_seguido), NULL)$$

DROP TRIGGER IF EXISTS trg_seguidores_ad$$
CREATE TRIGGER trg_seguidores_ad AFTER DELETE ON seguidores FOR EACH ROW
  CALL sp_auditar('seguidores', 'DELETE', CONCAT(OLD.id_seguidor, '->', OLD.id_seguido), NULL)$$

DROP TRIGGER IF EXISTS trg_invitaciones_ai$$
CREATE TRIGGER trg_invitaciones_ai AFTER INSERT ON equipo_invitaciones FOR EACH ROW
  CALL sp_auditar('equipo_invitaciones', 'INSERT', CONCAT(NEW.id_equipo, ':', NEW.id_usuario), NEW.estado)$$

DROP TRIGGER IF EXISTS trg_invitaciones_au$$
CREATE TRIGGER trg_invitaciones_au AFTER UPDATE ON equipo_invitaciones FOR EACH ROW
  CALL sp_auditar('equipo_invitaciones', 'UPDATE', CONCAT(NEW.id_equipo, ':', NEW.id_usuario),
                  CONCAT(OLD.estado, ' -> ', NEW.estado))$$

DROP TRIGGER IF EXISTS trg_tequipos_ai$$
CREATE TRIGGER trg_tequipos_ai AFTER INSERT ON torneo_equipos FOR EACH ROW
  CALL sp_auditar('torneo_equipos', 'INSERT', CONCAT(NEW.id_torneo, ':', NEW.id_equipo), NEW.estado_inscripcion)$$

DROP TRIGGER IF EXISTS trg_tequipos_au$$
CREATE TRIGGER trg_tequipos_au AFTER UPDATE ON torneo_equipos FOR EACH ROW
  CALL sp_auditar('torneo_equipos', 'UPDATE', CONCAT(NEW.id_torneo, ':', NEW.id_equipo),
                  CONCAT(OLD.estado_inscripcion, ' -> ', NEW.estado_inscripcion))$$

DROP TRIGGER IF EXISTS trg_tequipos_ad$$
CREATE TRIGGER trg_tequipos_ad AFTER DELETE ON torneo_equipos FOR EACH ROW
  CALL sp_auditar('torneo_equipos', 'DELETE', CONCAT(OLD.id_torneo, ':', OLD.id_equipo), NULL)$$

-- =====================================================================
-- RONDAS Y MÓDULOS
-- =====================================================================
DROP TRIGGER IF EXISTS trg_rondas_ai$$
CREATE TRIGGER trg_rondas_ai AFTER INSERT ON rondas FOR EACH ROW
  CALL sp_auditar('rondas', 'INSERT', NEW.id_ronda, JSON_OBJECT('torneo', NEW.id_torneo, 'nombre', NEW.nombre))$$

DROP TRIGGER IF EXISTS trg_rondas_au$$
CREATE TRIGGER trg_rondas_au AFTER UPDATE ON rondas FOR EACH ROW
  CALL sp_auditar('rondas', 'UPDATE', NEW.id_ronda, CONCAT(OLD.estado, ' -> ', NEW.estado))$$

DROP TRIGGER IF EXISTS trg_modulos_au$$
CREATE TRIGGER trg_modulos_au AFTER UPDATE ON modulos FOR EACH ROW
  CALL sp_auditar('modulos', 'UPDATE', NEW.codigo, CONCAT('habilitado: ', OLD.habilitado, ' -> ', NEW.habilitado))$$

DELIMITER ;
