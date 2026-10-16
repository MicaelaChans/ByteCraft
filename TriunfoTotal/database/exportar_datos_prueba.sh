#!/usr/bin/env bash
# =====================================================================
#  database/exportar_datos_prueba.sh
#  Exporta los datos generados por generar_datos_prueba.php a
#  02_datos_prueba.sql (solo INSERTs, sin estructura ni triggers).
#
#  Uso: DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASS=xxx ./database/exportar_datos_prueba.sh
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-triunfo_total_db}"

# Los catálogos (roles, modulos, disciplinas) ya se cargan en 01_esquema.sql
TABLAS="usuarios usuario_roles equipos equipo_miembros torneos torneo_equipos rondas partidos posiciones \
seguidores notificaciones intentos_login auditoria"

{
  echo "-- ====================================================================="
  echo "--  02_datos_prueba.sql — Datos de prueba (+50 registros por componente)"
  echo "--  Generado con database/generar_datos_prueba.php el $(date '+%Y-%m-%d %H:%M')"
  echo "--  Se carga ANTES de 03_logica.sql (sin triggers), así no se duplica la auditoría."
  echo "--  Admins: admin@ (Admin1234), pablo.admin@ (PabloAdmin1234), micaela.admin@ (MicaAdmin1234),"
  echo "--         federico.admin@ (FedeAdmin1234), claudio.admin@ (ClaudioAdmin1234) — todos @triunfototal.com"
  echo "--  Resto de los usuarios de prueba: Prueba1234"
  echo "-- ====================================================================="
  echo "USE \`$DB_NAME\`;"
  echo "SET FOREIGN_KEY_CHECKS = 0;"
  MYSQL_PWD="${DB_PASS:-}" mariadb-dump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --no-create-info --skip-triggers --complete-insert --skip-comments --skip-add-locks \
    --skip-disable-keys --skip-tz-utc "$DB_NAME" $TABLAS
  echo "SET FOREIGN_KEY_CHECKS = 1;"
} > 02_datos_prueba.sql

echo "Listo: $(grep -c '^INSERT' 02_datos_prueba.sql) sentencias INSERT en 02_datos_prueba.sql"
