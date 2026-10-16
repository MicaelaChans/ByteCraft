#!/usr/bin/env bash
# =====================================================================
#  scripts/respaldo.sh — Respaldos automáticos de TriunfoTotal
#
#  POLÍTICA DE RESPALDOS (ver docs/sistemas_operativos.md):
#   Tipo       | Qué incluye                           | Cuándo (cron)          | Se guardan
#   -----------|---------------------------------------|------------------------|-----------
#   diario     | base de datos completa                | todos los días 02:30   | 7
#   semanal    | base de datos + configuración/certs   | domingos 03:00         | 4
#   mensual    | base de datos + configuración/certs   | día 1 de cada mes 04:00| 6
#
#  Seguridad de cada respaldo:
#   - CIFRADO   AES-256 (openssl, clave en /root/.triunfototal/respaldo.key)
#   - HASH      SHA-256 para detectar si el archivo se corrompió
#   - FIRMA     digital RSA: prueba que el respaldo lo generó ESTE servidor
#               y que nadie lo modificó (se verifica antes de restaurar)
#   - Copia externa opcional por rsync (regla 3-2-1) si se define DESTINO_REMOTO
#
#  Uso:
#    sudo ./scripts/respaldo.sh diario|semanal|mensual
#    sudo ./scripts/respaldo.sh listar
#    sudo ./scripts/respaldo.sh verificar <archivo.enc>
#    sudo ./scripts/respaldo.sh restaurar <archivo.enc>
#    sudo ./scripts/respaldo.sh instalar-cron
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="respaldos"
set -o pipefail

DESTINO="${DESTINO_RESPALDOS:-/var/backups/triunfototal}"
CLAVES="${CLAVES_RESPALDO:-/root/.triunfototal}"
CLAVE_CIFRADO="$CLAVES/respaldo.key"
FIRMA_PRIVADA="$CLAVES/firma_privada.pem"
FIRMA_PUBLICA="$CLAVES/firma_publica.pem"
declare -A RETENCION=([diario]=7 [semanal]=4 [mensual]=6)

preparar_claves() {
  mkdir -p "$CLAVES" && chmod 700 "$CLAVES"
  if [ ! -f "$CLAVE_CIFRADO" ]; then
    openssl rand -base64 48 > "$CLAVE_CIFRADO"
    chmod 600 "$CLAVE_CIFRADO"
    aviso "Se generó la clave de cifrado $CLAVE_CIFRADO — ¡guardá una copia fuera del servidor!"
  fi
  if [ ! -f "$FIRMA_PRIVADA" ]; then
    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$FIRMA_PRIVADA" 2>/dev/null
    openssl pkey -in "$FIRMA_PRIVADA" -pubout -out "$FIRMA_PUBLICA"
    chmod 600 "$FIRMA_PRIVADA"
    ok "Se generó el par de claves de firma digital."
  fi
}

respaldar() {
  local tipo="$1"
  [ -n "${RETENCION[$tipo]:-}" ] || { error "Tipo inválido: $tipo (diario|semanal|mensual)"; exit 1; }
  cargar_env
  preparar_claves
  mkdir -p "$DESTINO/$tipo"
  local marca; marca="$(date +%Y%m%d_%H%M%S)"
  local trabajo; trabajo="$(mktemp -d)"
  trap 'rm -rf "$trabajo"' RETURN

  registrar "INICIO respaldo $tipo"

  # 1) Base de datos: volcado consistente sin bloquear la app (--single-transaction)
  if ! bd_ejecutar backup_triunfototal "${BACKUP_DB_PASS:-}" mariadb-dump \
        --single-transaction --routines --triggers --events --hex-blob \
        --databases "$BD_NOMBRE" > "$trabajo/base_de_datos.sql"; then
    registrar "ERROR respaldo $tipo: falló mariadb-dump"
    error "Falló el volcado de la base de datos."
    return 1
  fi

  # 2) Semanal/mensual: también la configuración y los certificados
  if [ "$tipo" != "diario" ]; then
    mkdir -p "$trabajo/config"
    cp -a "$PROYECTO_DIR/.env" "$trabajo/config/" 2>/dev/null
    cp -a "$PROYECTO_DIR/docker-compose.yml" "$PROYECTO_DIR/docker" "$trabajo/config/" 2>/dev/null
    docker cp "$CONTENEDOR_WEB:/etc/apache2/ssl" "$trabajo/config/ssl" 2>/dev/null || true
  fi

  # 3) Empaquetar + comprimir + CIFRAR (AES-256-CBC con PBKDF2)
  local archivo="$DESTINO/$tipo/triunfo_${tipo}_${marca}.tar.gz.enc"
  tar -czf - -C "$trabajo" . \
    | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$CLAVE_CIFRADO" -out "$archivo"

  # 4) HASH de integridad + FIRMA digital
  (cd "$(dirname "$archivo")" && sha256sum "$(basename "$archivo")" > "$(basename "$archivo").sha256")
  openssl dgst -sha256 -sign "$FIRMA_PRIVADA" -out "$archivo.sig" "$archivo"
  chmod 640 "$archivo" "$archivo".*
  chgrp triunfo-backup "$archivo" "$archivo".* 2>/dev/null || true

  # 5) Rotación: borra los más viejos según la política
  local sobran
  sobran=$(ls -1t "$DESTINO/$tipo"/*.enc 2>/dev/null | tail -n +"$((RETENCION[$tipo] + 1))")
  for viejo in $sobran; do
    rm -f "$viejo" "$viejo.sha256" "$viejo.sig"
    registrar "ROTACION borrado $(basename "$viejo")"
  done

  # 6) Copia fuera del servidor (opcional)
  if [ -n "${DESTINO_REMOTO:-}" ]; then
    rsync -az "$archivo" "$archivo.sha256" "$archivo.sig" "$DESTINO_REMOTO/$tipo/" \
      && registrar "COPIA REMOTA ok -> $DESTINO_REMOTO" \
      || registrar "ERROR copia remota a $DESTINO_REMOTO"
  fi

  local tam; tam="$(du -h "$archivo" | cut -f1)"
  registrar "FIN respaldo $tipo -> $(basename "$archivo") ($tam)"
  ok "Respaldo $tipo creado: $archivo ($tam)"
}

verificar() {
  local archivo="$1"
  [ -f "$archivo" ] || { error "No existe $archivo"; return 1; }
  (cd "$(dirname "$archivo")" && sha256sum -c --quiet "$(basename "$archivo").sha256") \
    && ok "Hash SHA-256 correcto (el archivo no está corrupto)" \
    || { error "El hash NO coincide: el archivo está dañado o fue modificado"; return 1; }
  openssl dgst -sha256 -verify "$FIRMA_PUBLICA" -signature "$archivo.sig" "$archivo" >/dev/null \
    && ok "Firma digital válida (lo generó este servidor y no fue alterado)" \
    || { error "Firma digital INVÁLIDA"; return 1; }
}

restaurar() {
  local archivo="$1"
  verificar "$archivo" || { error "No se restaura un respaldo que no pasa la verificación."; return 1; }
  cargar_env
  aviso "Esto REEMPLAZA la base de datos actual por la del respaldo."
  confirmar "¿Continuar con la restauración?" || return 0

  # Antes de pisar nada, respaldo de seguridad del estado actual
  respaldar diario || { error "No se pudo respaldar el estado actual; se cancela."; return 1; }

  local trabajo; trabajo="$(mktemp -d)"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$CLAVE_CIFRADO" -in "$archivo" | tar -xzf - -C "$trabajo"
  bd_ejecutar root "${DB_ROOT_PASS:-}" mariadb < "$trabajo/base_de_datos.sql" \
    && { ok "Base de datos restaurada desde $(basename "$archivo")"; registrar "RESTAURAR $(basename "$archivo")"; } \
    || error "Falló la restauración"
  rm -rf "$trabajo"
}

listar() {
  titulo "Respaldos disponibles en $DESTINO"
  for tipo in diario semanal mensual; do
    echo "${NEGRITA}$tipo${NORMAL} (se guardan ${RETENCION[$tipo]}):"
    ls -1sh "$DESTINO/$tipo"/*.enc 2>/dev/null | sed 's/^/   /' || echo "   (ninguno)"
  done
  echo; df -h "$DESTINO" | tail -1 | awk '{print "Espacio en disco: usado " $3 " de " $2 " (" $5 ")"}'
}

instalar_cron() {
  local dir; dir="$(cd "$(dirname "$0")" && pwd)"
  cat > /etc/cron.d/triunfototal <<EOF
# Tareas programadas de TriunfoTotal (instalado por respaldo.sh)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# m  h  dom mes dow usuario comando
30   2  *   *   *   root  $dir/respaldo.sh diario   >> $LOG_DIR/cron.log 2>&1
0    3  *   *   0   root  $dir/respaldo.sh semanal  >> $LOG_DIR/cron.log 2>&1
0    4  1   *   *   root  $dir/respaldo.sh mensual  >> $LOG_DIR/cron.log 2>&1
*/5  *  *   *   *   root  $dir/monitoreo.sh --cron  >> $LOG_DIR/cron.log 2>&1
0    5  *   *   1   root  $dir/seguridad_servidor.sh escanear >> $LOG_DIR/cron.log 2>&1
EOF
  chmod 644 /etc/cron.d/triunfototal
  mkdir -p "$LOG_DIR"
  ok "Cron instalado en /etc/cron.d/triunfototal:"
  grep -v '^#' /etc/cron.d/triunfototal | sed 's/^/   /'
}

exigir_root "$@"
case "${1:-}" in
  diario|semanal|mensual) respaldar "$1" ;;
  verificar)     verificar "${2:?Indicá el archivo .enc}" ;;
  restaurar)     restaurar "${2:?Indicá el archivo .enc}" ;;
  listar)        listar ;;
  instalar-cron) instalar_cron ;;
  *) echo "Uso: $0 diario|semanal|mensual|listar|verificar <archivo>|restaurar <archivo>|instalar-cron"; exit 1 ;;
esac
