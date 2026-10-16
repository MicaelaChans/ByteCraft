#!/bin/sh
# Arranque del contenedor web.
# Si no hay certificado SSL (primera vez), genera uno AUTOFIRMADO válido por 1 año.
# En un servidor con dominio real se reemplaza por uno de Let's Encrypt
# (ver docs/sistemas_operativos.md), montándolo en /etc/apache2/ssl.
set -e

: "${SERVIDOR_NOMBRE:=localhost}"
: "${HTTPS_PUERTO:=443}"
export SERVIDOR_NOMBRE HTTPS_PUERTO

if [ ! -f /etc/apache2/ssl/triunfo.crt ] || [ ! -f /etc/apache2/ssl/triunfo.key ]; then
  echo "[triunfo] Generando certificado SSL autofirmado para $SERVIDOR_NOMBRE..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/apache2/ssl/triunfo.key \
    -out /etc/apache2/ssl/triunfo.crt \
    -subj "/C=UY/ST=Montevideo/L=Montevideo/O=ByteCraft/OU=TriunfoTotal/CN=$SERVIDOR_NOMBRE" \
    -addext "subjectAltName=DNS:$SERVIDOR_NOMBRE,DNS:localhost,IP:127.0.0.1"
  chmod 600 /etc/apache2/ssl/triunfo.key
fi

exec "$@"
