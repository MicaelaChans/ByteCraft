#!/usr/bin/env bash
# =====================================================================
#  04_dcl.sh — DCL: usuarios de la base de datos y sus permisos
#
#  Principio de MÍNIMO PRIVILEGIO: cada usuario tiene solo lo que necesita.
#
#   Usuario              | Para qué                   | Permisos
#   ---------------------|----------------------------|-------------------------------------------
#   app_triunfototal     | la aplicación PHP          | SELECT/INSERT/UPDATE/DELETE en tablas de
#                        |                            | negocio; en `auditoria` SOLO SELECT/INSERT
#                        |                            | (nadie desde la app puede borrar huellas);
#                        |                            | EXECUTE para el procedimiento de posiciones.
#                        |                            | SIN DROP, ALTER, CREATE ni GRANT.
#   backup_triunfototal  | script de respaldos (cron) | solo lectura + LOCK TABLES, SHOW VIEW, TRIGGER
#   reportes_triunfototal| monitoreo / consultas      | solo SELECT (lectura) + PROCESS
#   dba_triunfototal     | administrador humano de BD | todo sobre ESTA base (no sobre el servidor)
#
#  Las contraseñas se pasan por variables de entorno (nunca escritas acá):
#    APP_DB_PASS, BACKUP_DB_PASS, REPORTES_DB_PASS, DBA_DB_PASS
#  DB_HOST_PERMITIDO: desde dónde se pueden conectar ('%' en Docker, 'localhost' en un servidor local).
#
#  Uso manual en un servidor:  sudo APP_DB_PASS='...' BACKUP_DB_PASS='...' ./04_dcl.sh
#  En Docker se ejecuta solo al crear el contenedor de la base (docker-entrypoint-initdb.d).
# =====================================================================

DB="${MARIADB_DATABASE:-triunfo_total_db}"
H="${DB_HOST_PERMITIDO:-%}"
APP_PASS="${APP_DB_PASS:-${MARIADB_PASSWORD:-}}"

if [ -z "$APP_PASS" ] || [ -z "${BACKUP_DB_PASS:-}" ]; then
  echo "04_dcl.sh: faltan APP_DB_PASS y/o BACKUP_DB_PASS" >&2
  return 1 2>/dev/null || exit 1
fi

# Tablas donde la app puede leer y escribir libremente
TABLAS_APP="usuarios roles usuario_roles disciplinas modulos torneos equipos equipo_miembros equipo_invitaciones torneo_equipos \
rondas partidos posiciones seguidores notificaciones intentos_login"

SQL="
-- Se recrean los usuarios para que el script se pueda correr varias veces
DROP USER IF EXISTS 'app_triunfototal'@'$H', 'backup_triunfototal'@'$H',
                    'reportes_triunfototal'@'$H', 'dba_triunfototal'@'$H';

-- 1) Usuario de la APLICACIÓN
CREATE USER 'app_triunfototal'@'$H' IDENTIFIED BY '$APP_PASS'
  WITH MAX_USER_CONNECTIONS 50;
"
for t in $TABLAS_APP; do
  SQL+="GRANT SELECT, INSERT, UPDATE, DELETE ON \`$DB\`.\`$t\` TO 'app_triunfototal'@'$H';"$'\n'
done
SQL+="
GRANT SELECT, INSERT ON \`$DB\`.\`auditoria\` TO 'app_triunfototal'@'$H';
GRANT SELECT ON \`$DB\`.\`v_torneos_publicos\` TO 'app_triunfototal'@'$H';
GRANT SELECT ON \`$DB\`.\`v_posiciones\` TO 'app_triunfototal'@'$H';
GRANT EXECUTE ON PROCEDURE \`$DB\`.\`sp_recalcular_posiciones\` TO 'app_triunfototal'@'$H';

-- 2) Usuario de RESPALDOS (mariadb-dump)
CREATE USER 'backup_triunfototal'@'$H' IDENTIFIED BY '$BACKUP_DB_PASS'
  WITH MAX_USER_CONNECTIONS 2;
GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT, EXECUTE ON \`$DB\`.* TO 'backup_triunfototal'@'$H';
GRANT SELECT ON mysql.proc TO 'backup_triunfototal'@'$H';
"
if [ -n "${REPORTES_DB_PASS:-}" ]; then
  SQL+="
-- 3) Usuario de REPORTES / MONITOREO (solo lectura)
CREATE USER 'reportes_triunfototal'@'$H' IDENTIFIED BY '$REPORTES_DB_PASS'
  WITH MAX_USER_CONNECTIONS 3;
GRANT SELECT ON \`$DB\`.* TO 'reportes_triunfototal'@'$H';
GRANT PROCESS ON *.* TO 'reportes_triunfototal'@'$H';
"
fi
if [ -n "${DBA_DB_PASS:-}" ]; then
  SQL+="
-- 4) DBA humano: todo sobre la base del proyecto, nada sobre el resto del servidor
CREATE USER 'dba_triunfototal'@'$H' IDENTIFIED BY '$DBA_DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB\`.* TO 'dba_triunfototal'@'$H';
"
fi
SQL+="FLUSH PRIVILEGES;"

# En Docker usa la clave de root del contenedor; en un servidor, el socket de root (sudo)
if [ -n "${MARIADB_ROOT_PASSWORD:-}" ]; then
  MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb -uroot <<< "$SQL"
else
  mariadb -uroot <<< "$SQL"
fi
echo "04_dcl.sh: usuarios de base de datos creados con mínimo privilegio."
