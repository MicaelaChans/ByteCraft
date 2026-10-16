#!/usr/bin/env bash
# =====================================================================
#  scripts/seguridad_servidor.sh — Endurecimiento (hardening) del servidor
#
#   firewall   -> UFW: todo cerrado salvo SSH (con límite), HTTP y HTTPS
#   fail2ban   -> IPS: banea IPs con muchos intentos fallidos (SSH y login de la app)
#   ssh        -> sin root por SSH, máximo 3 intentos, timeout de sesión
#   antivirus  -> ClamAV + escaneo semanal
#   kernel     -> parámetros sysctl contra spoofing / SYN flood
#   updates    -> actualizaciones de seguridad automáticas
#   todo       -> aplica todo lo anterior
#   estado     -> muestra cómo está cada protección
#   escanear   -> escaneo antivirus (lo usa el cron)
#
#  Uso: sudo ./scripts/seguridad_servidor.sh <opción>
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="seguridad"
PUERTO_SSH="${PUERTO_SSH:-22}"

firewall() {
  titulo "Firewall (UFW sobre iptables)"
  apt-get install -y ufw >/dev/null
  ufw --force reset >/dev/null
  ufw default deny incoming        # todo lo entrante cerrado por defecto
  ufw default allow outgoing
  ufw limit "$PUERTO_SSH"/tcp comment 'SSH con limite de conexiones (anti fuerza bruta)'
  ufw allow 80/tcp  comment 'HTTP (redirige a HTTPS)'
  ufw allow 443/tcp comment 'HTTPS TriunfoTotal'
  ufw logging medium
  ufw --force enable
  ok "Firewall activo. Reglas:"
  ufw status numbered
  # Nota: Docker publica puertos con sus propias reglas iptables (cadena DOCKER-USER).
  # Por eso la base de datos NO publica puertos y Netdata escucha solo en 127.0.0.1.
  registrar "FIREWALL configurado (ssh=$PUERTO_SSH, 80, 443)"
}

fail2ban() {
  titulo "fail2ban (sistema de prevención de intrusiones)"
  apt-get install -y fail2ban >/dev/null

  # Filtro propio: logins fallidos o bloqueados en la API de TriunfoTotal
  cat > /etc/fail2ban/filter.d/triunfototal-login.conf <<'EOF'
[Definition]
failregex = ^<HOST> \S+ \S+ \[[^\]]+\] "POST /api/auth/login HTTP/[0-9.]+" (401|429)
ignoreregex =
EOF

  cat > /etc/fail2ban/jail.d/triunfototal.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled  = true
port     = $PUERTO_SSH
maxretry = 3
bantime  = 24h

# Los contenedores Docker reciben el tráfico por la cadena DOCKER-USER,
# así que el baneo se aplica ahí (si no, no afectaría a la web).
[triunfototal-login]
enabled  = true
filter   = triunfototal-login
logpath  = $PROYECTO_DIR/logs/apache/access.log
port     = http,https
chain    = DOCKER-USER
maxretry = 10
bantime  = 1h

[apache-badbots]
enabled  = true
logpath  = $PROYECTO_DIR/logs/apache/access.log
port     = http,https
chain    = DOCKER-USER
EOF
  mkdir -p "$PROYECTO_DIR/logs/apache" && touch "$PROYECTO_DIR/logs/apache/access.log"
  systemctl enable --now fail2ban >/dev/null 2>&1
  systemctl restart fail2ban
  sleep 2
  fail2ban-client status
  registrar "FAIL2BAN configurado (sshd, triunfototal-login, apache-badbots)"
}

ssh_seguro() {
  titulo "SSH seguro"
  local conf=/etc/ssh/sshd_config.d/99-triunfototal.conf
  cat > "$conf" <<EOF
# Endurecimiento SSH TriunfoTotal
Port $PUERTO_SSH
PermitRootLogin no
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
PermitEmptyPasswords no
AllowGroups triunfo-admin triunfo-dev triunfo-backup sudo
EOF
  if confirmar "¿Deshabilitar el login con contraseña (solo claves SSH)? Hacelo SOLO si ya cargaste tu clave pública"; then
    echo "PasswordAuthentication no" >> "$conf"
  fi
  if sshd -t; then
    systemctl reload ssh 2>/dev/null || systemctl reload sshd
    ok "SSH endurecido ($conf)"
    registrar "SSH endurecido"
  else
    error "La configuración de SSH tiene errores; se deshace."
    rm -f "$conf"
  fi
}

antivirus() {
  titulo "Antivirus ClamAV"
  apt-get install -y clamav clamav-daemon >/dev/null
  systemctl stop clamav-freshclam 2>/dev/null
  freshclam >/dev/null 2>&1 || aviso "No se pudieron actualizar las firmas ahora (se reintenta solo)."
  systemctl enable --now clamav-freshclam >/dev/null 2>&1
  ok "ClamAV instalado. El escaneo semanal lo programa: ./scripts/respaldo.sh instalar-cron"
  registrar "ANTIVIRUS instalado"
}

escanear() {
  mkdir -p "$LOG_DIR"
  local informe="$LOG_DIR/clamav_$(date +%Y%m%d).log"
  clamscan -ri --exclude-dir='^/proc|^/sys|^/dev' "$PROYECTO_DIR" /home /tmp /var/www /var/backups > "$informe" 2>&1
  local infectados; infectados=$(grep -E '^Infected files:' "$informe" | awk '{print $3}')
  registrar "ESCANEO antivirus: ${infectados:-?} archivos infectados (informe $informe)"
  [ "${infectados:-0}" != "0" ] && registrar "ALERTA antivirus encontró $infectados archivo(s) infectado(s)"
}

kernel() {
  titulo "Parámetros de red del kernel (sysctl)"
  cat > /etc/sysctl.d/99-triunfototal.conf <<'EOF'
# Protección contra SYN flood
net.ipv4.tcp_syncookies = 1
# Ignorar redirecciones ICMP y paquetes con ruta de origen (anti spoofing / MITM)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_redirects = 0
# Validación de ruta inversa (descarta IPs falsificadas)
net.ipv4.conf.all.rp_filter = 1
# Registrar paquetes "marcianos" (direcciones imposibles)
net.ipv4.conf.all.log_martians = 1
# No responder pings broadcast (ataque smurf)
net.ipv4.icmp_echo_ignore_broadcasts = 1
EOF
  sysctl --system >/dev/null && ok "Parámetros aplicados."
  registrar "SYSCTL aplicado"
}

actualizaciones() {
  titulo "Actualizaciones automáticas de seguridad"
  apt-get install -y unattended-upgrades >/dev/null
  dpkg-reconfigure -f noninteractive unattended-upgrades
  ok "unattended-upgrades activo: los parches de seguridad se instalan solos."
  registrar "UNATTENDED-UPGRADES activado"
}

estado() {
  titulo "Estado de seguridad"
  echo "${NEGRITA}Firewall:${NORMAL}";      ufw status verbose 2>/dev/null | sed 's/^/  /' || echo "  ufw no instalado"
  echo "${NEGRITA}fail2ban:${NORMAL}";      fail2ban-client status 2>/dev/null | sed 's/^/  /' || echo "  no instalado"
  echo "${NEGRITA}SSH:${NORMAL}";           sshd -T 2>/dev/null | grep -Ei '^(port|permitrootlogin|passwordauthentication|maxauthtries) ' | sed 's/^/  /'
  echo "${NEGRITA}ClamAV:${NORMAL}";        systemctl is-active clamav-freshclam 2>/dev/null | sed 's/^/  firmas: /'
  echo "${NEGRITA}Actualizaciones:${NORMAL}"; systemctl is-active unattended-upgrades 2>/dev/null | sed 's/^/  /'
  echo "${NEGRITA}Puertos escuchando:${NORMAL}"; ss -tulpn | awk 'NR==1 || /LISTEN/' | sed 's/^/  /'
  echo "${NEGRITA}Reglas iptables (DOCKER-USER):${NORMAL}"; iptables -S DOCKER-USER 2>/dev/null | sed 's/^/  /'
}

exigir_root "$@"
case "${1:-}" in
  firewall) firewall ;;
  fail2ban) fail2ban ;;
  ssh) ssh_seguro ;;
  antivirus) antivirus ;;
  escanear) escanear ;;
  kernel) kernel ;;
  updates) actualizaciones ;;
  estado) estado ;;
  todo) apt-get update >/dev/null; firewall; fail2ban; kernel; actualizaciones; antivirus; ssh_seguro; estado ;;
  *) echo "Uso: $0 firewall|fail2ban|ssh|antivirus|escanear|kernel|updates|todo|estado"; exit 1 ;;
esac
