#!/usr/bin/env bash
# =====================================================================
#  scripts/gestion_usuarios.sh — Gestión de usuarios del SISTEMA OPERATIVO
#
#  Grupos del proyecto (análisis de usuarios del sistema):
#    triunfo-admin  -> administradores del servidor (sudo + docker)
#    triunfo-dev    -> desarrolladores (docker, leen logs, sin sudo)
#    triunfo-backup -> operador de respaldos (solo lee/escribe /var/backups/triunfototal)
#
#  Uso interactivo:   sudo ./scripts/gestion_usuarios.sh
#  Uso por comandos:  sudo ./scripts/gestion_usuarios.sh crear juan triunfo-dev
#                     sudo ./scripts/gestion_usuarios.sh bloquear juan
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="usuarios"
GRUPOS=(triunfo-admin triunfo-dev triunfo-backup)

crear_grupos() {
  for g in "${GRUPOS[@]}"; do
    getent group "$g" >/dev/null || { groupadd "$g" && ok "Grupo $g creado"; }
  done
  getent group docker >/dev/null || groupadd docker
  mkdir -p /var/backups/triunfototal
  chown root:triunfo-backup /var/backups/triunfototal
  chmod 2770 /var/backups/triunfototal   # setgid: los archivos nuevos heredan el grupo
}

validar_nombre() {
  if [[ ! "$1" =~ ^[a-z_][a-z0-9_-]{2,31}$ ]]; then
    error "Nombre inválido: minúsculas, números, - y _, entre 3 y 32 caracteres, empezando con letra."
    return 1
  fi
}

crear_usuario() {
  local usuario="$1" grupo="${2:-triunfo-dev}"
  validar_nombre "$usuario" || return 1
  if id "$usuario" >/dev/null 2>&1; then error "El usuario $usuario ya existe."; return 1; fi
  if [[ ! " ${GRUPOS[*]} " =~ " $grupo " ]]; then error "Grupo inválido: $grupo"; return 1; fi
  crear_grupos

  useradd -m -s /bin/bash -g "$grupo" "$usuario"
  case "$grupo" in
    triunfo-admin) usermod -aG sudo,docker,adm "$usuario" ;;
    triunfo-dev)   usermod -aG docker,adm "$usuario" ;;
  esac

  # Contraseña temporal aleatoria: se obliga a cambiarla en el primer login
  local temporal; temporal="$(openssl rand -base64 12)"
  echo "$usuario:$temporal" | chpasswd
  chage -d 0 "$usuario"                # vence YA: debe cambiarla al entrar
  chage -M 90 -m 1 -W 7 "$usuario"     # política: máx 90 días, mín 1, aviso 7 días antes
  chmod 750 "/home/$usuario"

  ok "Usuario $usuario creado en el grupo $grupo"
  echo "   Contraseña temporal: ${NEGRITA}$temporal${NORMAL}  (se pide cambiarla en el primer ingreso)"
  registrar "CREAR usuario=$usuario grupo=$grupo"
}

eliminar_usuario() {
  local usuario="$1"
  id "$usuario" >/dev/null 2>&1 || { error "No existe $usuario"; return 1; }
  [ "$usuario" = "root" ] && { error "No se puede eliminar root."; return 1; }
  confirmar "¿Eliminar a $usuario y archivar su carpeta personal?" || return 0
  tar -czf "/var/backups/triunfototal/home_${usuario}_$(date +%Y%m%d%H%M).tar.gz" -C /home "$usuario" 2>/dev/null
  pkill -u "$usuario" 2>/dev/null
  userdel -r "$usuario" && ok "Usuario $usuario eliminado (su home quedó archivado en /var/backups/triunfototal)"
  registrar "ELIMINAR usuario=$usuario"
}

bloquear_usuario()    { usermod -L -e 1 "$1" && ok "Usuario $1 bloqueado" && registrar "BLOQUEAR usuario=$1"; }
desbloquear_usuario() { usermod -U -e "" "$1" && ok "Usuario $1 desbloqueado" && registrar "DESBLOQUEAR usuario=$1"; }

resetear_password() {
  local usuario="$1" temporal
  id "$usuario" >/dev/null 2>&1 || { error "No existe $usuario"; return 1; }
  temporal="$(openssl rand -base64 12)"
  echo "$usuario:$temporal" | chpasswd && chage -d 0 "$usuario"
  ok "Nueva contraseña temporal de $usuario: ${NEGRITA}$temporal${NORMAL}"
  registrar "RESET_PASSWORD usuario=$usuario"
}

cambiar_grupo() {
  local usuario="$1" grupo="$2"
  [[ " ${GRUPOS[*]} " =~ " $grupo " ]] || { error "Grupo inválido"; return 1; }
  usermod -g "$grupo" "$usuario"
  gpasswd -d "$usuario" sudo >/dev/null 2>&1
  case "$grupo" in
    triunfo-admin) usermod -aG sudo,docker,adm "$usuario" ;;
    triunfo-dev)   usermod -aG docker,adm "$usuario" ;;
    triunfo-backup) gpasswd -d "$usuario" docker >/dev/null 2>&1 ;;
  esac
  ok "$usuario ahora pertenece a $grupo"
  registrar "CAMBIAR_GRUPO usuario=$usuario grupo=$grupo"
}

listar_usuarios() {
  titulo "Usuarios del proyecto"
  printf "%-16s %-16s %-10s %-12s %s\n" USUARIO GRUPO ESTADO VENCE_CLAVE ULTIMO_LOGIN
  for g in "${GRUPOS[@]}"; do
    local gid; gid="$(getent group "$g" | cut -d: -f3)"
    [ -z "$gid" ] && continue
    while IFS=: read -r u _ _ ugid _; do
      [ "$ugid" = "$gid" ] || continue
      local estado="activo"
      passwd -S "$u" 2>/dev/null | awk '{print $2}' | grep -q '^L' && estado="bloqueado"
      local vence; vence="$(chage -l "$u" | awk -F': ' '/Password expires|La contraseña caduca/ {print $2}')"
      local ultimo; ultimo="$(lastlog -u "$u" 2>/dev/null | tail -1 | awk '{print $4,$5,$6,$9}')"
      printf "%-16s %-16s %-10s %-12s %s\n" "$u" "$g" "$estado" "${vence:0:12}" "$ultimo"
    done < /etc/passwd
  done
}

aplicar_politica_contrasenas() {
  # Política del sistema operativo (coincide con la de la aplicación)
  apt-get install -y libpam-pwquality >/dev/null 2>&1
  cat > /etc/security/pwquality.conf <<'EOF'
# Política de contraseñas TriunfoTotal
minlen = 10
ucredit = -1
lcredit = -1
dcredit = -1
ocredit = -1
maxrepeat = 3
dictcheck = 1
enforce_for_root
EOF
  sed -ri 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/; s/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   1/; s/^PASS_WARN_AGE.*/PASS_WARN_AGE   7/' /etc/login.defs
  ok "Política aplicada: mín. 10 caracteres con mayúscula, minúscula, número y símbolo; vence cada 90 días."
  registrar "POLITICA_CONTRASENAS aplicada"
}

menu() {
  while true; do
    titulo "Gestión de usuarios del sistema — TriunfoTotal"
    echo " 1) Listar usuarios del proyecto"
    echo " 2) Crear usuario"
    echo " 3) Eliminar usuario"
    echo " 4) Bloquear usuario"
    echo " 5) Desbloquear usuario"
    echo " 6) Resetear contraseña"
    echo " 7) Cambiar de grupo"
    echo " 8) Aplicar política de contraseñas"
    echo " 0) Salir"
    read -r -p "Opción: " op
    case "$op" in
      1) listar_usuarios ;;
      2) read -r -p "Nombre de usuario: " u
         echo "Grupos: ${GRUPOS[*]}"; read -r -p "Grupo [triunfo-dev]: " g
         crear_usuario "$u" "${g:-triunfo-dev}" ;;
      3) read -r -p "Usuario a eliminar: " u; eliminar_usuario "$u" ;;
      4) read -r -p "Usuario a bloquear: " u; bloquear_usuario "$u" ;;
      5) read -r -p "Usuario a desbloquear: " u; desbloquear_usuario "$u" ;;
      6) read -r -p "Usuario: " u; resetear_password "$u" ;;
      7) read -r -p "Usuario: " u; read -r -p "Nuevo grupo (${GRUPOS[*]}): " g; cambiar_grupo "$u" "$g" ;;
      8) aplicar_politica_contrasenas ;;
      0) exit 0 ;;
      *) aviso "Opción inválida" ;;
    esac
    pausa
  done
}

exigir_root "$@"
case "${1:-}" in
  crear)       crear_usuario "$2" "${3:-triunfo-dev}" ;;
  eliminar)    eliminar_usuario "$2" ;;
  bloquear)    bloquear_usuario "$2" ;;
  desbloquear) desbloquear_usuario "$2" ;;
  reset)       resetear_password "$2" ;;
  grupo)       cambiar_grupo "$2" "$3" ;;
  listar)      listar_usuarios ;;
  politica)    aplicar_politica_contrasenas ;;
  "")          menu ;;
  *) echo "Uso: $0 [crear <usuario> [grupo] | eliminar | bloquear | desbloquear | reset <usuario> | grupo <usuario> <grupo> | listar | politica]"; exit 1 ;;
esac
