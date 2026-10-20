#!/usr/bin/env bash
# =====================================================================
#  scripts/monitoreo.sh — Monitoreo del servidor y de la aplicación
#
#  Controla: CPU, RAM, disco, servicios (docker, ssh, fail2ban, ufw),
#  contenedores, que la web responda por HTTPS, vencimiento del certificado,
#  la base de datos y los intentos de login fallidos (posibles ataques).
#  Si algo supera un umbral, lo registra como ALERTA en
#  /var/log/triunfototal/monitoreo.log (y opcionalmente manda un mail).
#
#  Complemento gráfico: Netdata (docker compose --profile monitoreo up -d)
#  en http://localhost:19999 (o por túnel SSH).
#
#  Uso:  sudo ./scripts/monitoreo.sh          -> reporte en pantalla
#        sudo ./scripts/monitoreo.sh --cron   -> modo silencioso (solo alertas al log)
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="monitoreo"

UMBRAL_CPU="${UMBRAL_CPU:-85}"       # % de uso
UMBRAL_RAM="${UMBRAL_RAM:-90}"       # % de uso
UMBRAL_DISCO="${UMBRAL_DISCO:-85}"   # % de uso
UMBRAL_LOGIN_FALLIDOS="${UMBRAL_LOGIN_FALLIDOS:-30}"  # en la última hora
URL_SALUD="${URL_SALUD:-https://localhost/api/disciplinas}"
MODO_CRON=0; [ "${1:-}" = "--cron" ] && MODO_CRON=1
ALERTAS=0

mostrar() { [ $MODO_CRON -eq 0 ] && echo "$*"; }
alerta() {
  ALERTAS=$((ALERTAS + 1))
  registrar "ALERTA $*"
  [ $MODO_CRON -eq 0 ] && error "$*"
  if [ -n "${MAIL_ALERTAS:-}" ] && command -v mail >/dev/null; then
    echo "$*" | mail -s "[TriunfoTotal] ALERTA en $(hostname)" "$MAIL_ALERTAS"
  fi
}
bien() { [ $MODO_CRON -eq 0 ] && ok "$*"; }

cargar_env

# ---------- Recursos ----------
[ $MODO_CRON -eq 0 ] && titulo "Recursos del servidor ($(hostname) — $(date '+%d/%m/%Y %H:%M'))"
cpu=$(top -bn2 -d 0.5 | grep '^%Cpu' | tail -1 | awk -F'id,' '{split($1,a,","); print int(100 - a[length(a)])}')
ram=$(free | awk '/^Mem:/ {printf "%d", ($3/$2)*100}')
mostrar "CPU: ${cpu}%   RAM: ${ram}%   Carga: $(cut -d' ' -f1-3 /proc/loadavg)   Encendido: $(uptime -p)"
[ "$cpu" -ge "$UMBRAL_CPU" ] && alerta "CPU alta: ${cpu}% (umbral ${UMBRAL_CPU}%)" || bien "CPU normal"
[ "$ram" -ge "$UMBRAL_RAM" ] && alerta "RAM alta: ${ram}% (umbral ${UMBRAL_RAM}%)" || bien "RAM normal"

while read -r uso punto; do
  uso=${uso%\%}
  mostrar "Disco $punto: ${uso}%"
  [ "$uso" -ge "$UMBRAL_DISCO" ] && alerta "Disco $punto al ${uso}% (umbral ${UMBRAL_DISCO}%)"
done < <(df -P -x tmpfs -x devtmpfs -x overlay -x squashfs -x efivarfs | awk 'NR>1 {print $5, $6}')

# ---------- Servicios del sistema ----------
[ $MODO_CRON -eq 0 ] && titulo "Servicios"
for s in docker ssh fail2ban ufw cron; do
  if systemctl list-unit-files "$s.service" >/dev/null 2>&1 && systemctl list-unit-files "$s.service" | grep -q "$s"; then
    systemctl is-active --quiet "$s" && bien "$s activo" || alerta "Servicio $s DETENIDO"
  else
    mostrar "  $s no instalado"
  fi
done

# ---------- Contenedores ----------
[ $MODO_CRON -eq 0 ] && titulo "Contenedores"
for c in "$CONTENEDOR_WEB" "$CONTENEDOR_BD"; do
  if contenedor_activo "$c"; then
    salud=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}sin healthcheck{{end}}' "$c")
    [ "$salud" = "unhealthy" ] && alerta "Contenedor $c en estado unhealthy" || bien "$c corriendo ($salud)"
  else
    alerta "Contenedor $c NO está corriendo"
  fi
done
[ $MODO_CRON -eq 0 ] && docker stats --no-stream --format "  {{.Name}}: CPU {{.CPUPerc}} RAM {{.MemUsage}}" 2>/dev/null

# ---------- Aplicación ----------
[ $MODO_CRON -eq 0 ] && titulo "Aplicación"
inicio=$(date +%s%N)
codigo=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$URL_SALUD")
ms=$(( ($(date +%s%N) - inicio) / 1000000 ))
[ "$codigo" = "200" ] && bien "La API responde (HTTP 200 en ${ms} ms)" || alerta "La API no responde bien (HTTP $codigo)"
[ "$ms" -gt 3000 ] && alerta "La API está lenta: ${ms} ms"

# Certificado SSL: avisa 15 días antes de que venza
host=$(echo "$URL_SALUD" | sed -E 's#https://([^/:]+).*#\1#')
vence=$(echo | openssl s_client -connect "$host:${HTTPS_PUERTO:-443}" -servername "$host" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$vence" ]; then
  dias=$(( ($(date -d "$vence" +%s) - $(date +%s)) / 86400 ))
  [ "$dias" -lt 15 ] && alerta "El certificado SSL vence en $dias días" || bien "Certificado SSL vigente ($dias días restantes)"
fi

# ---------- Base de datos ----------
[ $MODO_CRON -eq 0 ] && titulo "Base de datos"
fallidos=$(bd_consulta "SELECT COUNT(*) FROM intentos_login WHERE exito=0 AND creado_en > NOW() - INTERVAL 1 HOUR" 2>/dev/null | grep -Eo '[0-9]+' | tail -1)
if [ -n "$fallidos" ]; then
  bien "La base responde"
  mostrar "  Logins fallidos última hora: $fallidos"
  [ "$fallidos" -ge "$UMBRAL_LOGIN_FALLIDOS" ] && alerta "Posible ataque de fuerza bruta: $fallidos logins fallidos en 1 hora"
else
  alerta "No se pudo consultar la base de datos"
fi

# ---------- Seguridad ----------
if command -v fail2ban-client >/dev/null && [ $MODO_CRON -eq 0 ]; then
  titulo "IPs bloqueadas por fail2ban"
  for jail in $(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:\s*//p' | tr ',' ' '); do
    echo "  $jail: $(fail2ban-client status "$jail" | sed -n 's/.*Banned IP list:\s*//p')"
  done
fi

[ $MODO_CRON -eq 0 ] && { echo; [ $ALERTAS -eq 0 ] && ok "Todo en orden." || aviso "$ALERTAS alerta(s). Ver $LOG_DIR/monitoreo.log"; }
[ $MODO_CRON -eq 1 ] && [ $ALERTAS -eq 0 ] && registrar "OK sin alertas"
exit 0
