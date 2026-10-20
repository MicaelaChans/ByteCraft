#!/usr/bin/env bash
# =====================================================================
#  tests/prueba_verificacion_email.sh — Prueba del flujo de verificación de email
#
#  El servidor tiene que correr con CORREO_MODO=archivo, guardando los mails
#  en CORREO_CARPETA. La prueba lee el mail, saca el link y lo "toca".
#
#  Uso:
#    BASE=http://localhost/api/index.php CORREO_CARPETA=/tmp/correos \
#    ADMIN_EMAIL=admin@triunfototal.com ADMIN_PASS=Admin1234 ./tests/prueba_verificacion_email.sh
#  Requiere: curl, jq y python3
# =====================================================================
set -u
BASE="${BASE:?Falta BASE}"
CARPETA="${CORREO_CARPETA:?Falta CORREO_CARPETA (carpeta donde el servidor guarda los .eml)}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@triunfototal.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin1234}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
SUF="$(date +%s)$RANDOM"; PASS='Prueba1234'; OK=0; FALLOS=0

pedir() {
  local quien="$1" metodo="$2" ruta="$3" cuerpo="${4:-}"
  local args=(-sk -o "$TMP/cuerpo" -w '%{http_code}' -X "$metodo" -b "$TMP/$quien.c" -c "$TMP/$quien.c")
  [ -n "$cuerpo" ] && args+=(-H 'Content-Type: application/json' --data "$cuerpo")
  curl "${args[@]}" "$BASE/$ruta" > "$TMP/codigo"; cat "$TMP/cuerpo"
}
comprobar() {
  if eval "$2"; then OK=$((OK+1)); printf '\033[32m  ✔ %s\033[0m\n' "$1"
  else FALLOS=$((FALLOS+1)); printf '\033[31m  ✘ %s (código %s: %s)\033[0m\n' "$1" "$(cat "$TMP/codigo")" "$(head -c 200 "$TMP/cuerpo")"; fi
}
# Saca el token del último mail enviado a $1 (decodifica el MIME con python)
token_de() {
  local archivo; archivo=$(ls -t "$CARPETA"/*"$1"*.eml 2>/dev/null | head -1)
  [ -z "$archivo" ] && return 1
  python3 -I -c '
import email, re, sys
m = email.message_from_file(open(sys.argv[1]))
for p in m.walk():
    if p.get_content_type() == "text/plain":
        t = re.search(r"token=([a-f0-9]{64})", p.get_payload(decode=True).decode())
        print(t.group(1) if t else "")' "$archivo"
}

U1="verif1.$SUF@gmail.com"; U2="verif2.$SUF@gmail.com"
echo "== Verificación de email ($BASE)"

R=$(pedir u1 POST auth/registro "{\"nombre\":\"Ana\",\"apellido\":\"Prueba\",\"email\":\"$U1\",\"password\":\"$PASS\"}")
comprobar "Registro pide verificación (201 + requiere_verificacion)" '[ "$(cat $TMP/codigo)" = 201 ] && [ "$(echo "$R" | jq .data.requiere_verificacion)" = true ]'
pedir u1 GET auth/sesion > /dev/null
comprobar "Al registrarse NO queda logueado" '[ "$(jq -r .data "$TMP/cuerpo")" = null ]'

T1=$(token_de "$U1")
comprobar "Llegó el mail con un token de 64 caracteres" '[ ${#T1} -eq 64 ]'

pedir u1 POST auth/login "{\"email\":\"$U1\",\"password\":\"$PASS\"}" > /dev/null
comprobar "Sin verificar no puede iniciar sesión (403 email_no_verificado)" \
  '[ "$(cat $TMP/codigo)" = 403 ] && [ "$(jq -r .detalles.codigo "$TMP/cuerpo")" = email_no_verificado ]'

pedir u1 POST auth/verificar '{"token":"0000000000000000000000000000000000000000000000000000000000000000"}' > /dev/null
comprobar "Un token inventado no sirve (400)" '[ "$(cat $TMP/codigo)" = 400 ]'

pedir u1 POST auth/verificar "{\"token\":\"$T1\"}" > /dev/null
comprobar "El token del mail activa la cuenta (200)" '[ "$(cat $TMP/codigo)" = 200 ]'
pedir u1 GET auth/sesion > /dev/null
comprobar "Después de verificar queda logueado" '[ "$(jq -r .data.email "$TMP/cuerpo")" = "$U1" ] && [ "$(jq -r .data.email_verificado "$TMP/cuerpo")" = 1 ]'

pedir u1b POST auth/verificar "{\"token\":\"$T1\"}" > /dev/null
comprobar "El mismo link no se puede usar dos veces (400)" '[ "$(cat $TMP/codigo)" = 400 ]'

pedir u1b POST auth/login "{\"email\":\"$U1\",\"password\":\"$PASS\"}" > /dev/null
comprobar "Ya verificado, el login funciona (200)" '[ "$(cat $TMP/codigo)" = 200 ]'

pedir u2 POST auth/registro "{\"nombre\":\"Beto\",\"apellido\":\"Prueba\",\"email\":\"$U2\",\"password\":\"$PASS\"}" > /dev/null
pedir u2 POST auth/reenviar-verificacion "{\"email\":\"$U2\"}" > /dev/null
comprobar "Reenviar enseguida está limitado (429, anti-spam)" '[ "$(cat $TMP/codigo)" = 429 ]'
pedir x POST auth/reenviar-verificacion '{"email":"nadie.existe@gmail.com"}' > /dev/null
comprobar "Reenviar a un email inexistente responde igual (no revela cuentas)" '[ "$(cat $TMP/codigo)" = 200 ]'

pedir adm POST auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" > /dev/null
ID2=$(pedir adm GET "admin/usuarios?q=$U2" | jq -r '.data.usuarios[0].id_usuario')
pedir adm PUT "admin/usuarios/$ID2/verificar" > /dev/null
comprobar "El admin puede verificar una cuenta a mano" '[ "$(cat $TMP/codigo)" = 200 ]'
pedir u2 POST auth/login "{\"email\":\"$U2\",\"password\":\"$PASS\"}" > /dev/null
comprobar "Verificado por el admin, ya puede entrar" '[ "$(cat $TMP/codigo)" = 200 ]'

echo; echo "Resultado: $OK pruebas OK, $FALLOS fallidas"
[ $FALLOS -eq 0 ]
