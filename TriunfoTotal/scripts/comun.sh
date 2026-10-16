#!/usr/bin/env bash
# =====================================================================
#  scripts/comun.sh — funciones compartidas por todos los scripts
#  (se "incluye" con:  source "$(dirname "$0")/comun.sh")
#  Sistema operativo objetivo: Ubuntu Server 22.04 / 24.04 LTS
# =====================================================================

# Carpeta raíz del proyecto (la que tiene docker-compose.yml)
PROYECTO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${LOG_DIR:-/var/log/triunfototal}"
CONTENEDOR_BD="${CONTENEDOR_BD:-triunfo_db}"
CONTENEDOR_WEB="${CONTENEDOR_WEB:-triunfo_web}"
BD_NOMBRE="${BD_NOMBRE:-triunfo_total_db}"

# --- Colores para que la salida sea fácil de leer ---
if [ -t 1 ]; then
  ROJO=$'\e[31m'; VERDE=$'\e[32m'; AMARILLO=$'\e[33m'; AZUL=$'\e[34m'; NEGRITA=$'\e[1m'; NORMAL=$'\e[0m'
else
  ROJO=""; VERDE=""; AMARILLO=""; AZUL=""; NEGRITA=""; NORMAL=""
fi

ok()      { echo "${VERDE}✔${NORMAL} $*"; }
aviso()   { echo "${AMARILLO}⚠${NORMAL} $*"; }
error()   { echo "${ROJO}✘${NORMAL} $*" >&2; }
titulo()  { echo; echo "${NEGRITA}${AZUL}== $* ==${NORMAL}"; }

# Escribe en el log del script (y en pantalla)
registrar() {
  local archivo="$LOG_DIR/${NOMBRE_LOG:-triunfototal}.log"
  mkdir -p "$LOG_DIR" 2>/dev/null || true
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$(whoami)] $*" | tee -a "$archivo" 2>/dev/null || echo "$*"
}

exigir_root() {
  if [ "$(id -u)" -ne 0 ]; then
    error "Este script necesita permisos de administrador. Ejecutalo con: sudo $0 $*"
    exit 1
  fi
}

confirmar() { # confirmar "¿Seguro?" -> 0 si responde s/S
  local r
  read -r -p "$1 [s/N] " r
  [[ "$r" =~ ^[sS]$ ]]
}

pausa() { read -r -p "Presioná ENTER para continuar..." _; }

# Carga las variables del .env del proyecto (contraseñas de la BD, puertos...)
cargar_env() {
  if [ -f "$PROYECTO_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROYECTO_DIR/.env"
    set +a
  else
    aviso "No existe $PROYECTO_DIR/.env (copiá .env.example y completalo)."
  fi
}

# Docker Compose v2 ("docker compose") o v1 ("docker-compose")
compose() {
  if docker compose version >/dev/null 2>&1; then
    (cd "$PROYECTO_DIR" && docker compose "$@")
  elif command -v docker-compose >/dev/null 2>&1; then
    (cd "$PROYECTO_DIR" && docker-compose "$@")
  else
    error "No está instalado Docker Compose. Ejecutá: sudo ./scripts/instalar.sh"
    return 1
  fi
}

contenedor_activo() {
  [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = "true" ]
}

# Ejecuta un cliente de MariaDB (mariadb / mariadb-dump) con un usuario dado.
# La contraseña viaja por variable de entorno MYSQL_PWD (no queda en el historial).
#   bd_ejecutar <usuario> <clave> <programa> [argumentos...]
bd_ejecutar() {
  local usuario="$1" clave="$2" programa="$3"; shift 3
  if contenedor_activo "$CONTENEDOR_BD"; then
    docker exec -i -e MYSQL_PWD="$clave" "$CONTENEDOR_BD" "$programa" -u "$usuario" "$@"
  elif command -v "$programa" >/dev/null 2>&1; then
    MYSQL_PWD="$clave" "$programa" -u "$usuario" -h "${DB_HOST_LOCAL:-127.0.0.1}" -P "${DB_PORT_LOCAL:-3306}" "$@"
  else
    error "La base de datos no está disponible (ni el contenedor $CONTENEDOR_BD ni un MariaDB local)."
    return 1
  fi
}

# Consulta SQL de solo lectura con el usuario de reportes (o root si no hay)
bd_consulta() {
  if [ -n "${REPORTES_DB_PASS:-}" ]; then
    bd_ejecutar reportes_triunfototal "$REPORTES_DB_PASS" mariadb "$BD_NOMBRE" -t -e "$1"
  else
    bd_ejecutar root "${DB_ROOT_PASS:-}" mariadb "$BD_NOMBRE" -t -e "$1"
  fi
}
