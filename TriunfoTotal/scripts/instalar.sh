#!/usr/bin/env bash
# =====================================================================
#  scripts/instalar.sh — Instalación completa en un Ubuntu Server limpio
#
#   1. Instala Docker y Docker Compose
#   2. Crea el archivo .env con contraseñas ALEATORIAS fuertes
#   3. Construye y levanta los contenedores (web + base de datos)
#   4. Programa respaldos y monitoreo (cron)
#   5. (opcional) Aplica el endurecimiento de seguridad del servidor
#
#  Uso:  sudo ./scripts/instalar.sh
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="instalacion"
set -e
exigir_root "$@"

titulo "1/5 Docker"
if ! command -v docker >/dev/null; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2 curl openssl rsync
  systemctl enable --now docker
  ok "Docker instalado"
else
  ok "Docker ya estaba instalado ($(docker --version))"
  docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-v2
fi

titulo "2/5 Configuración (.env)"
if [ ! -f "$PROYECTO_DIR/.env" ]; then
  clave() { openssl rand -base64 24 | tr -d '/+=' | cut -c1-24; }
  sed -e "s/^DB_ROOT_PASS=.*/DB_ROOT_PASS=$(clave)/" \
      -e "s/^APP_DB_PASS=.*/APP_DB_PASS=$(clave)/" \
      -e "s/^BACKUP_DB_PASS=.*/BACKUP_DB_PASS=$(clave)/" \
      -e "s/^REPORTES_DB_PASS=.*/REPORTES_DB_PASS=$(clave)/" \
      "$PROYECTO_DIR/.env.example" > "$PROYECTO_DIR/.env"
  read -r -p "Nombre o IP del servidor [localhost]: " nombre
  sed -i "s/^SERVIDOR_NOMBRE=.*/SERVIDOR_NOMBRE=${nombre:-localhost}/" "$PROYECTO_DIR/.env"
  chmod 600 "$PROYECTO_DIR/.env"
  ok ".env creado con contraseñas aleatorias (permisos 600: solo root lo lee)"
else
  ok ".env ya existe, no se toca"
fi

titulo "3/5 Contenedores"
mkdir -p "$PROYECTO_DIR/logs/apache"
compose up -d --build
echo "Esperando a que la base de datos termine de inicializarse..."
for _ in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$CONTENEDOR_WEB" 2>/dev/null)" = "healthy" ] && break
  sleep 3
done
compose ps

titulo "4/5 Respaldos y monitoreo"
bash "$PROYECTO_DIR/scripts/gestion_usuarios.sh" listar >/dev/null 2>&1 || true
getent group triunfo-backup >/dev/null || groupadd triunfo-backup
bash "$PROYECTO_DIR/scripts/respaldo.sh" instalar-cron

titulo "5/5 Seguridad del servidor"
if confirmar "¿Aplicar ahora firewall, fail2ban, antivirus y endurecimiento de SSH?"; then
  bash "$PROYECTO_DIR/scripts/seguridad_servidor.sh" todo
else
  aviso "Podés hacerlo después con: sudo ./scripts/seguridad_servidor.sh todo"
fi

cargar_env
registrar "INSTALACION completa"
echo
ok "${NEGRITA}TriunfoTotal está funcionando en https://${SERVIDOR_NOMBRE:-localhost}${NORMAL}"
echo "   Usuario administrador de prueba: admin@triunfototal.com / Admin1234  (¡cambiale la contraseña!)"
echo "   El certificado es autofirmado: el navegador va a mostrar una advertencia la primera vez."
