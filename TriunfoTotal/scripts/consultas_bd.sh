#!/usr/bin/env bash
# =====================================================================
#  scripts/consultas_bd.sh — Consultas y monitoreo de la base de datos
#  Usa el usuario de SOLO LECTURA reportes_triunfototal (mínimo privilegio).
#
#  Uso:  ./scripts/consultas_bd.sh            -> menú
#        ./scripts/consultas_bd.sh estado     -> una consulta directa
# =====================================================================
source "$(dirname "$0")/comun.sh"
NOMBRE_LOG="consultas_bd"
cargar_env

estado() {
  titulo "Estado del servidor de base de datos"
  bd_consulta "SELECT VERSION() AS version,
                      (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='UPTIME') AS segundos_encendida,
                      (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='THREADS_CONNECTED') AS conexiones,
                      (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME='SLOW_QUERIES') AS consultas_lentas"
}

tamanos() {
  titulo "Tamaño y cantidad de registros por tabla"
  bd_consulta "SELECT table_name AS tabla, table_rows AS filas_aprox,
                      ROUND((data_length + index_length)/1024, 1) AS kb
                 FROM information_schema.tables
                WHERE table_schema = '$BD_NOMBRE' AND table_type = 'BASE TABLE'
                ORDER BY (data_length + index_length) DESC"
}

conexiones() {
  titulo "Conexiones activas"
  bd_consulta "SELECT id, user AS usuario, host, db, command AS comando, time AS segundos, LEFT(info, 60) AS consulta
                 FROM information_schema.processlist ORDER BY time DESC"
}

resumen() {
  titulo "Resumen del negocio"
  bd_consulta "SELECT
     (SELECT COUNT(*) FROM usuarios) AS usuarios,
     (SELECT COUNT(*) FROM usuarios WHERE estado='Baneado') AS baneados,
     (SELECT COUNT(*) FROM torneos) AS torneos,
     (SELECT COUNT(*) FROM torneos WHERE estado_torneo='En Proceso') AS en_curso,
     (SELECT COUNT(*) FROM torneos WHERE estado_aprobacion='Pendiente') AS pendientes,
     (SELECT COUNT(*) FROM partidos WHERE estado='Finalizado') AS partidos_jugados"
  bd_consulta "SELECT d.nombre AS disciplina, COUNT(t.id_torneo) AS torneos
                 FROM disciplinas d LEFT JOIN torneos t ON t.id_disciplina = d.id_disciplina
                GROUP BY d.id_disciplina ORDER BY torneos DESC"
}

top_torneos() {
  titulo "Torneos con más participantes"
  bd_consulta "SELECT id_torneo, nombre, disciplina, formato, estado_torneo, inscriptos, max_equipos
                 FROM v_torneos_publicos ORDER BY inscriptos DESC LIMIT 10"
}

auditoria() {
  local n="${1:-20}"
  titulo "Últimos $n movimientos de auditoría"
  bd_consulta "SELECT a.creado_en AS fecha, COALESCE(u.email,'anónimo') AS usuario, a.tabla_afectada AS tabla,
                      a.accion, a.id_registro AS id, a.ip
                 FROM auditoria a LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
                ORDER BY a.id_auditoria DESC LIMIT $n"
}

seguridad() {
  titulo "Seguridad: logins fallidos por IP (últimas 24 h)"
  bd_consulta "SELECT ip, COUNT(*) AS intentos, COUNT(DISTINCT email) AS cuentas_distintas, MAX(creado_en) AS ultimo
                 FROM intentos_login WHERE exito = 0 AND creado_en > NOW() - INTERVAL 1 DAY
                GROUP BY ip ORDER BY intentos DESC LIMIT 15"
  titulo "Usuarios baneados"
  bd_consulta "SELECT id_usuario, email, nombre, apellido FROM usuarios WHERE estado = 'Baneado'"
}

integridad() {
  titulo "Chequeo de integridad de tablas (CHECK TABLE)"
  local tablas
  tablas=$(bd_consulta "SELECT GROUP_CONCAT(table_name) FROM information_schema.tables WHERE table_schema='$BD_NOMBRE' AND table_type='BASE TABLE'" \
           | grep -Eo '[a-z_]+(,[a-z_]+)+' | tr ',' ' ')
  for t in $tablas; do
    bd_consulta "CHECK TABLE \`$t\`" | grep -E "status|error|warning" | grep -v Msg_type
  done
  registrar "CHECK TABLE ejecutado"
}

exportar_csv() {
  local destino="${1:-$PROYECTO_DIR/reporte_torneos_$(date +%Y%m%d).csv}"
  bd_ejecutar reportes_triunfototal "${REPORTES_DB_PASS:-}" mariadb "$BD_NOMBRE" -B -e \
    "SELECT id_torneo, nombre, disciplina, formato, modalidad, tipo, estado_torneo, inscriptos, organizador FROM v_torneos_publicos" \
    | sed 's/\t/;/g' > "$destino"
  ok "Reporte exportado: $destino"
}

menu() {
  while true; do
    titulo "Consultas a la base de datos — TriunfoTotal"
    echo " 1) Estado del servidor MariaDB      5) Últimos movimientos de auditoría"
    echo " 2) Tamaño de tablas                 6) Seguridad (logins fallidos, baneados)"
    echo " 3) Conexiones activas               7) Chequeo de integridad"
    echo " 4) Resumen del negocio / top        8) Exportar reporte de torneos (CSV)"
    echo " 0) Salir"
    read -r -p "Opción: " op
    case "$op" in
      1) estado ;; 2) tamanos ;; 3) conexiones ;; 4) resumen; top_torneos ;;
      5) read -r -p "¿Cuántos? [20] " n; auditoria "${n:-20}" ;;
      6) seguridad ;; 7) integridad ;; 8) exportar_csv ;;
      0) exit 0 ;; *) aviso "Opción inválida" ;;
    esac
    pausa
  done
}

case "${1:-}" in
  estado) estado ;; tamanos) tamanos ;; conexiones) conexiones ;; resumen) resumen; top_torneos ;;
  auditoria) auditoria "${2:-20}" ;; seguridad) seguridad ;; integridad) integridad ;; csv) exportar_csv "${2:-}" ;;
  "") menu ;;
  *) echo "Uso: $0 [estado|tamanos|conexiones|resumen|auditoria [n]|seguridad|integridad|csv [archivo]]"; exit 1 ;;
esac
