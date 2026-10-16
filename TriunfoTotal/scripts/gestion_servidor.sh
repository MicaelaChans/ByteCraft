#!/usr/bin/env bash
# =====================================================================
#  scripts/gestion_servidor.sh — SCRIPT GENERAL de gestión del servidor
#  Menú único que reúne todas las tareas de administración.
#
#  Uso: sudo ./scripts/gestion_servidor.sh
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="gestion"
DIR="$(cd "$(dirname "$0")" && pwd)"

info_sistema() {
  titulo "Información del sistema"
  echo "Equipo:      $(hostname)  —  $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "Kernel:      $(uname -r)"
  echo "Encendido:   $(uptime -p)"
  echo "CPU:         $(nproc) núcleos — carga $(cut -d' ' -f1-3 /proc/loadavg)"
  free -h | awk '/^Mem:/ {print "RAM:         " $3 " usados de " $2}'
  df -h / | awk 'NR==2 {print "Disco (/):   " $3 " usados de " $2 " (" $5 ")"}'
  echo "IP(s):       $(hostname -I)"
  echo "Usuarios conectados:"; who | sed 's/^/   /'
}

aplicacion() {
  while true; do
    titulo "Aplicación (Docker)"
    echo " 1) Estado de los contenedores     5) Reconstruir y actualizar (git pull + build)"
    echo " 2) Iniciar                        6) Ver logs de la web"
    echo " 3) Detener                        7) Ver logs de la base de datos"
    echo " 4) Reiniciar                      8) Iniciar también Netdata (monitoreo gráfico)"
    echo " 0) Volver"
    read -r -p "Opción: " op
    case "$op" in
      1) compose ps; docker stats --no-stream ;;
      2) compose up -d && registrar "APP iniciada" ;;
      3) confirmar "¿Detener la aplicación?" && compose stop && registrar "APP detenida" ;;
      4) compose restart && registrar "APP reiniciada" ;;
      5) (cd "$PROYECTO_DIR" && git pull) ; "$DIR/respaldo.sh" diario && compose up -d --build && registrar "APP actualizada" ;;
      6) docker logs --tail 50 "$CONTENEDOR_WEB" ;;
      7) docker logs --tail 50 "$CONTENEDOR_BD" ;;
      8) compose --profile monitoreo up -d && ok "Netdata en http://localhost:19999 (túnel: ssh -L 19999:localhost:19999 usuario@servidor)" ;;
      0) return ;;
      *) aviso "Opción inválida" ;;
    esac
    pausa
  done
}

respaldos() {
  while true; do
    titulo "Respaldos"
    echo " 1) Listar respaldos      3) Verificar un respaldo (hash + firma)"
    echo " 2) Respaldar ahora       4) Restaurar un respaldo"
    echo " 5) Instalar/actualizar tareas programadas (cron)"
    echo " 0) Volver"
    read -r -p "Opción: " op
    case "$op" in
      1) "$DIR/respaldo.sh" listar ;;
      2) read -r -p "Tipo (diario/semanal/mensual) [diario]: " t; "$DIR/respaldo.sh" "${t:-diario}" ;;
      3) read -r -e -p "Archivo .enc: " a; "$DIR/respaldo.sh" verificar "$a" ;;
      4) read -r -e -p "Archivo .enc: " a; "$DIR/respaldo.sh" restaurar "$a" ;;
      5) "$DIR/respaldo.sh" instalar-cron ;;
      0) return ;;
      *) aviso "Opción inválida" ;;
    esac
    pausa
  done
}

mantenimiento() {
  titulo "Mantenimiento"
  echo "Actualizando paquetes del sistema..."
  apt-get update && apt-get -y upgrade
  echo "Limpiando imágenes y capas Docker sin uso..."
  docker system prune -f
  echo "Rotando logs viejos de la app (más de 30 días)..."
  find "$LOG_DIR" -name '*.log' -mtime +30 -delete 2>/dev/null
  journalctl --vacuum-time=30d >/dev/null 2>&1
  ok "Mantenimiento terminado"
  registrar "MANTENIMIENTO ejecutado"
}

exigir_root "$@"
while true; do
  titulo "TriunfoTotal — Gestión del servidor"
  echo " 1) Información del sistema"
  echo " 2) Aplicación (iniciar, detener, logs, actualizar)"
  echo " 3) Monitoreo (recursos, servicios, alertas)"
  echo " 4) Respaldos"
  echo " 5) Usuarios del sistema"
  echo " 6) Consultas a la base de datos"
  echo " 7) Seguridad (firewall, fail2ban, antivirus, estado)"
  echo " 8) Mantenimiento (actualizar y limpiar)"
  echo " 9) Ver últimas alertas"
  echo " 0) Salir"
  read -r -p "Opción: " op
  case "$op" in
    1) info_sistema; pausa ;;
    2) aplicacion ;;
    3) "$DIR/monitoreo.sh"; pausa ;;
    4) respaldos ;;
    5) "$DIR/gestion_usuarios.sh" ;;
    6) "$DIR/consultas_bd.sh" ;;
    7) read -r -p "firewall|fail2ban|ssh|antivirus|kernel|updates|todo|estado: " s; "$DIR/seguridad_servidor.sh" "${s:-estado}"; pausa ;;
    8) mantenimiento; pausa ;;
    9) grep -h ALERTA "$LOG_DIR"/*.log 2>/dev/null | tail -20 || echo "Sin alertas"; pausa ;;
    0) exit 0 ;;
    *) aviso "Opción inválida" ;;
  esac
done
