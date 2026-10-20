#!/usr/bin/env bash
# =====================================================================
#  tests/prueba_api.sh — Pruebas funcionales automáticas de la API
#
#  Recorre los casos de uso principales de punta a punta:
#   registro/login, validaciones, roles y permisos, torneo formal con
#   aprobación del admin, los 3 módulos (liga, eliminación, suizo)
#   completos hasta el campeón, baneo, fuerza bruta y auditoría.
#
#  Uso:
#    BASE=https://localhost/api ADMIN_EMAIL=admin@triunfototal.com ADMIN_PASS='Admin1234' ./tests/prueba_api.sh
#  Requiere: curl y jq
# =====================================================================
set -u

BASE="${BASE:-http://localhost/api/index.php}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@triunfototal.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin1234}"
TMP="$(mktemp -d)"
SUF="$(date +%s)$RANDOM"
PASS='Prueba1234'
OK=0; FALLOS=0

trap 'rm -rf "$TMP"' EXIT

verde() { printf '\033[32m%s\033[0m\n' "$*"; }
rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }

# pedir <usuario> <MÉTODO> <ruta> [json]  -> imprime el cuerpo; el código queda en $TMP/codigo
pedir() {
  local quien="$1" metodo="$2" ruta="$3" cuerpo="${4:-}"
  local args=(-sk -o "$TMP/cuerpo" -w '%{http_code}' -X "$metodo" -b "$TMP/$quien.cookies" -c "$TMP/$quien.cookies")
  [ -n "$cuerpo" ] && args+=(-H 'Content-Type: application/json' --data "$cuerpo")
  curl "${args[@]}" "$BASE/$ruta" > "$TMP/codigo"
  cat "$TMP/cuerpo"
}
codigo() { cat "$TMP/codigo"; }

# esperar <descripción> <código esperado>
esperar() {
  if [ "$(codigo)" = "$2" ]; then OK=$((OK+1)); verde "  ✔ $1"
  else FALLOS=$((FALLOS+1)); rojo "  ✘ $1 (esperaba $2, vino $(codigo)): $(head -c 300 "$TMP/cuerpo")"; fi
}
comprobar() { # comprobar <descripción> <condición bash>
  if eval "$2"; then OK=$((OK+1)); verde "  ✔ $1"; else FALLOS=$((FALLOS+1)); rojo "  ✘ $1"; fi
}

registrar() { # registrar <alias-sesion> <nombre>
  pedir "$1" POST auth/registro "{\"nombre\":\"$2\",\"apellido\":\"Prueba\",\"email\":\"$1.$SUF@gmail.com\",\"password\":\"$PASS\"}" > /dev/null
}

# Juega TODO un torneo: carga resultados al azar y cierra rondas hasta que termine
jugar_torneo() { # jugar_torneo <id> <permite_empates 0|1>
  local id="$1" empates="$2" vueltas=0
  while [ $vueltas -lt 30 ]; do
    vueltas=$((vueltas+1))
    local det; det="$(pedir org GET "torneos/$id")"
    [ "$(echo "$det" | jq -r .data.torneo.estado_torneo)" = "Finalizado" ] && return 0
    for ronda in $(echo "$det" | jq -r '.data.rondas[] | select(.estado=="Abierta") | .id_ronda'); do
      for p in $(echo "$det" | jq -r ".data.rondas[] | select(.id_ronda==$ronda) | .partidos[] | select(.estado!=\"Finalizado\") | .id_partido"); do
        local gl=$((RANDOM % 4)) gv=$((RANDOM % 4))
        [ "$empates" = 0 ] && [ $gl -eq $gv ] && gl=$((gl+1))
        pedir org PUT "partidos/$p" "{\"goles_local\":$gl,\"goles_visita\":$gv}" > /dev/null
        [ "$(codigo)" = 200 ] || { rojo "    error cargando partido $p: $(cat "$TMP/cuerpo")"; return 1; }
      done
      pedir org POST "rondas/$ronda/cerrar" > /dev/null
      [ "$(codigo)" = 200 ] || { rojo "    error cerrando ronda $ronda: $(cat "$TMP/cuerpo")"; return 1; }
    done
  done
  return 1
}

echo "== API: $BASE"

echo "== 1. Registro, login y validaciones"
pedir anon POST auth/registro '{"nombre":"A","apellido":"B","email":"no-es-email","password":"123"}' > /dev/null
esperar "Registro con datos inválidos -> 422" 422
registrar org "Organizador"; esperar "Registro del organizador -> 201" 201
for j in j1 j2 j3 j4 j5 j6; do registrar $j "Jugador $j"; done
esperar "Registro de jugadores" 201
pedir anon POST auth/registro '{"nombre":"Falso","apellido":"Dominio","email":"x@dominioquenoexiste-xyz123.com","password":"Prueba1234"}' > /dev/null
esperar "Email con dominio inexistente (sin registro MX) -> 422" 422
pedir anon POST auth/registro "{\"nombre\":\"Dup\",\"apellido\":\"Dup\",\"email\":\"org.$SUF@gmail.com\",\"password\":\"$PASS\"}" > /dev/null
esperar "Email duplicado -> 409" 409
pedir anon POST auth/login "{\"email\":\"org.$SUF@gmail.com\",\"password\":\"Incorrecta1\"}" > /dev/null
esperar "Login con contraseña incorrecta -> 401" 401
pedir org GET auth/sesion | jq -e '.data.roles == ["Usuario"]' > /dev/null
comprobar "El usuario nuevo tiene rol dinámico 'Usuario'" '[ $? -eq 0 ]'
pedir admin POST auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" > /dev/null
esperar "Login del administrador" 200

echo "== 2. Permisos"
pedir anon POST torneos '{"nombre":"X"}' > /dev/null;            esperar "Crear torneo sin sesión -> 401" 401
pedir j1 GET admin/estadisticas > /dev/null;                       esperar "Usuario común en panel admin -> 403" 403
pedir anon POST torneos/1/iniciar > /dev/null
comprobar "Iniciar torneo ajeno sin sesión -> 401" '[ "$(codigo)" = 401 ]'

echo "== 3. Torneo FORMAL: requiere aprobación del admin"
F=$(pedir org POST torneos '{"nombre":"Copa Formal Prueba","id_disciplina":1,"formato":"Liga","tipo":"Formal","max_equipos":8}' | jq -r .data.torneo.id_torneo)
esperar "Crear torneo formal" 201
pedir org GET "torneos/$F" | jq -e '.data.torneo.estado_aprobacion=="Pendiente"' > /dev/null
comprobar "Queda Pendiente (trigger de la base)" '[ $? -eq 0 ]'
pedir j1 GET "torneos/$F" > /dev/null;                             esperar "Otro usuario no lo ve hasta aprobarse -> 404" 404
pedir org PUT "admin/torneos/$F/aprobacion" '{"aprobado":true}' > /dev/null
esperar "El organizador NO puede autoaprobarse -> 403" 403
pedir admin PUT "admin/torneos/$F/aprobacion" '{"aprobado":false}' > /dev/null
esperar "Rechazar sin motivo -> 422" 422
pedir admin PUT "admin/torneos/$F/aprobacion" '{"aprobado":true}' > /dev/null
esperar "El admin aprueba el torneo formal" 200
pedir j1 GET "torneos/$F" > /dev/null;                             esperar "Ahora es público" 200

echo "== 4. Módulo LIGA (ida y vuelta, 4 equipos)"
L=$(pedir org POST torneos '{"nombre":"Liga Prueba","id_disciplina":1,"formato":"Liga","max_equipos":4,"ida_y_vuelta":true}' | jq -r .data.torneo.id_torneo)
esperar "Crear liga informal (se aprueba sola)" 201
for j in j1 j2 j3 j4 j5; do
  E=$(pedir $j POST equipos "{\"nombre\":\"Equipo $j $SUF\"}" | jq -r .data.id_equipo)
  eval "EQ_$j=$E"
done
esperar "Crear equipos" 201
pedir j1 POST "equipos/$EQ_j1/miembros" "{\"usuario\":\"j6.$SUF@gmail.com\"}" > /dev/null
esperar "Capitán agrega un miembro por email" 201
pedir j6 POST "torneos/$L/inscripciones" "{\"id_equipo\":$EQ_j1}" > /dev/null
esperar "Un jugador que no es capitán no puede inscribir -> 403" 403
for j in j1 j2 j3 j4 j5; do eval "E=\$EQ_$j"; pedir $j POST "torneos/$L/inscripciones" "{\"id_equipo\":$E}" > /dev/null; done
esperar "Capitanes piden inscripción" 201
pedir j1 PUT "torneos/$L/inscripciones/$EQ_j2" '{"estado":"Aceptada"}' > /dev/null
esperar "Un participante no puede aceptar inscripciones -> 403" 403
for j in j1 j2 j3 j4; do eval "E=\$EQ_$j"; pedir org PUT "torneos/$L/inscripciones/$E" '{"estado":"Aceptada"}' > /dev/null; done
esperar "El organizador acepta 4 equipos" 200
pedir org PUT "torneos/$L/inscripciones/$EQ_j5" '{"estado":"Aceptada"}' > /dev/null
esperar "No se puede superar el cupo -> 409" 409
pedir org POST "torneos/$L/iniciar" > /dev/null;                     esperar "Iniciar liga" 200
DET=$(pedir org GET "torneos/$L")
comprobar "4 equipos ida y vuelta = 6 jornadas" '[ "$(echo "$DET" | jq ".data.rondas|length")" = 6 ]'
comprobar "12 partidos en total" '[ "$(echo "$DET" | jq "[.data.rondas[].partidos[]]|length")" = 12 ]'
comprobar "Cada par de equipos se enfrenta exactamente 2 veces" \
  '[ "$(echo "$DET" | jq -c "[.data.rondas[].partidos[] | [.id_equipo_local,.id_equipo_visita]|sort|tostring] | group_by(.) | map(length) | unique")" = "[2]" ]'
pedir org PUT "partidos/$(echo "$DET" | jq -r '.data.rondas[0].partidos[0].id_partido')" '{"goles_local":-1,"goles_visita":2}' > /dev/null
esperar "Resultado negativo -> 422" 422
pedir org POST "rondas/$(echo "$DET" | jq -r '.data.rondas[0].id_ronda')/cerrar" > /dev/null
esperar "No se cierra una ronda con partidos sin resultado -> 409" 409
jugar_torneo "$L" 1; comprobar "La liga se juega completa" '[ $? -eq 0 ]'
DET=$(pedir org GET "torneos/$L")
comprobar "Torneo Finalizado con campeón = 1º de la tabla" \
  '[ "$(echo "$DET" | jq ".data.torneo.id_campeon == .data.posiciones[0].id_equipo and .data.torneo.estado_torneo == \"Finalizado\"")" = true ]'
comprobar "Cada equipo jugó 6 partidos" '[ "$(echo "$DET" | jq -c "[.data.posiciones[].partidos_jugados]|unique")" = "[6]" ]'
comprobar "Goles a favor totales = goles en contra totales" \
  '[ "$(echo "$DET" | jq "([.data.posiciones[].goles_favor]|add) == ([.data.posiciones[].goles_contra]|add)")" = true ]'
comprobar "Puntos = 3*G + 1*E" '[ "$(echo "$DET" | jq "all(.data.posiciones[]; .puntos == 3*.ganados + .empatados)")" = true ]'

echo "== 5. Módulo ELIMINACIÓN DIRECTA (5 equipos -> llave de 8 con 3 BYE)"
X=$(pedir org POST torneos '{"nombre":"Copa Eliminación Prueba","id_disciplina":5,"formato":"Eliminacion","max_equipos":8}' | jq -r .data.torneo.id_torneo)
for j in j1 j2 j3 j4 j5; do eval "E=\$EQ_$j"; pedir org POST "torneos/$X/inscripciones" "{\"id_equipo\":$E,\"directo\":true}" > /dev/null; done
esperar "El organizador inscribe directo" 201
pedir org POST "torneos/$X/iniciar" > /dev/null;                       esperar "Iniciar eliminación" 200
DET=$(pedir org GET "torneos/$X")
comprobar "Primera ronda = Cuartos de final con 3 BYE" \
  '[ "$(echo "$DET" | jq -c "[.data.rondas[0].nombre, ([.data.rondas[0].partidos[]|select(.id_equipo_visita==null)]|length)]")" = "[\"Cuartos de final\",3]" ]'
P=$(echo "$DET" | jq -r '.data.rondas[0].partidos[] | select(.id_equipo_visita!=null) | .id_partido' | head -1)
pedir org PUT "partidos/$P" '{"goles_local":1,"goles_visita":1}' > /dev/null
esperar "En eliminación no se permite empate -> 422" 422
jugar_torneo "$X" 0; comprobar "La eliminación se juega hasta la final" '[ $? -eq 0 ]'
DET=$(pedir org GET "torneos/$X")
comprobar "Rondas: Cuartos, Semifinal, Final" '[ "$(echo "$DET" | jq -c "[.data.rondas[].nombre]")" = "[\"Cuartos de final\",\"Semifinal\",\"Final\"]" ]'
comprobar "Campeón = ganador de la final" '[ "$(echo "$DET" | jq ".data.torneo.id_campeon != null")" = true ]'

echo "== 6. Módulo SUIZO individual (5 jugadores, impar -> BYE rotativo)"
S=$(pedir org POST torneos '{"nombre":"Suizo Ajedrez Prueba","id_disciplina":4,"formato":"Suizo","modalidad":"Individual","max_equipos":8,"puntos_victoria":2,"puntos_empate":1}' | jq -r .data.torneo.id_torneo)
esperar "Crear suizo individual" 201
for j in j1 j2 j3 j4 j5; do pedir $j POST "torneos/$S/inscripciones" '{}' > /dev/null; done
esperar "Jugadores se inscriben individualmente" 201
pedir j1 POST "torneos/$S/inscripciones" '{}' > /dev/null;              esperar "No se puede inscribir dos veces -> 409" 409
for id in $(pedir org GET "torneos/$S" | jq -r '.data.inscripciones[].id_equipo'); do
  pedir org PUT "torneos/$S/inscripciones/$id" '{"estado":"Aceptada"}' > /dev/null
done
pedir org POST "torneos/$S/iniciar" > /dev/null;                        esperar "Iniciar suizo" 200
jugar_torneo "$S" 1; comprobar "El suizo se juega completo" '[ $? -eq 0 ]'
DET=$(pedir org GET "torneos/$S")
comprobar "ceil(log2(5)) = 3 rondas" '[ "$(echo "$DET" | jq ".data.rondas|length")" = 3 ]'
comprobar "Nadie repite rival" \
  '[ "$(echo "$DET" | jq "[.data.rondas[].partidos[] | select(.id_equipo_visita!=null) | [.id_equipo_local,.id_equipo_visita]|sort|tostring] | (length == (unique|length))")" = true ]'
comprobar "Nadie recibe dos BYE" \
  '[ "$(echo "$DET" | jq "[.data.rondas[].partidos[] | select(.id_equipo_visita==null) | .id_equipo_local] | (length == (unique|length))")" = true ]'

echo "== 7. Administración y seguridad"
pedir admin PUT admin/modulos '{"codigo":"Suizo","habilitado":false}' > /dev/null; esperar "Admin deshabilita el módulo Suizo" 200
pedir org POST torneos '{"nombre":"Suizo deshabilitado","id_disciplina":4,"formato":"Suizo","max_equipos":8}' > /dev/null
esperar "No se pueden crear torneos de un módulo deshabilitado -> 422" 422
pedir admin PUT admin/modulos '{"codigo":"Suizo","habilitado":true}' > /dev/null
ID_J5=$(pedir j5 GET auth/sesion | jq -r .data.id_usuario)
pedir admin PUT "admin/usuarios/$ID_J5/estado" '{"estado":"Baneado"}' > /dev/null; esperar "Admin banea a un usuario" 200
pedir j5 GET perfil/torneos > /dev/null;                                         esperar "La sesión del baneado se corta al instante -> 401" 401
pedir j5 POST auth/login "{\"email\":\"j5.$SUF@gmail.com\",\"password\":\"$PASS\"}" > /dev/null
esperar "El baneado no puede entrar -> 403" 403
for i in 1 2 3 4 5; do pedir bruto POST auth/login "{\"email\":\"j4.$SUF@gmail.com\",\"password\":\"Mala$i\"}" > /dev/null; done
pedir bruto POST auth/login "{\"email\":\"j4.$SUF@gmail.com\",\"password\":\"$PASS\"}" > /dev/null
esperar "Tras 5 intentos fallidos se bloquea el login (fuerza bruta) -> 429" 429
COD=$(curl -sk -o /dev/null -w '%{http_code}' -X POST --data 'email=a&password=b' "$BASE/auth/login")
comprobar "Un formulario que no es JSON se rechaza (protección CSRF) -> 415" '[ "$COD" = 415 ]'
AUD=$(pedir admin GET "admin/auditoria?tabla=partidos&accion=UPDATE")
comprobar "La auditoría registró las cargas de resultados con su autor" \
  '[ "$(echo "$AUD" | jq ".data.total > 0 and (.data.registros[0].email != null)")" = true ]'
pedir admin GET "admin/auditoria?accion=LOGIN_FALLIDO" | jq -e '.data.total > 0' > /dev/null
comprobar "La auditoría registró los logins fallidos" '[ $? -eq 0 ]'

echo
echo "Resultado: $OK pruebas OK, $FALLOS fallidas"
[ $FALLOS -eq 0 ]
