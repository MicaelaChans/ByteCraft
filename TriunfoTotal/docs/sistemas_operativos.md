# Administración de Sistemas Operativos — TriunfoTotal

ByteCraft · 3° MO Nocturno · ITS Arias-Balparda · 2026

Este documento cubre las tres entregas de la asignatura:

- estudio de sistemas operativos y análisis de usuarios;
- script de gestión de usuarios;
- política de respaldos;
- script de respaldos con cron;
- monitoreo;
- políticas de seguridad;
- firewall y antivirus;
- script de consultas a la base;
- script general;
- implementación con Docker.

---

## 1. Estudio de sistemas operativos

### 1.1 Servidor: **Ubuntu Server 24.04 LTS** (o 22.04 LTS)

| Criterio | Ubuntu Server LTS | Debian 12 | Rocky Linux 9 | Windows Server 2022 |
|---|---|---|---|---|
| Costo de licencia | Gratis | Gratis | Gratis | ~USD 1.000+ |
| Soporte | 5 años (10 con Pro) | ~5 años | 10 años | 10 años |
| Docker / Apache / MariaDB | Paquetes oficiales | Paquetes oficiales | Sí (con algo más de configuración) | Posible, pero no nativo |
| Recursos mínimos | 1 GB RAM / 1 CPU | 512 MB | 1,5 GB | 2 GB+ y GUI opcional |
| Documentación y comunidad | Muy amplia (en español también) | Amplia | Media | Amplia |
| Lo visto en clase | Sí | Similar | Distinto (dnf, SELinux) | No |

**Elección: Ubuntu Server LTS.**

- No tiene costo de licencia, un punto clave del análisis de costos.
- Ofrece soporte de seguridad a largo plazo.
- Es la base de las imágenes Docker más usadas.
- Incluye UFW, fail2ban y `unattended-upgrades` listos para usar.
- Es lo que se trabajó en el curso.
- Se instala **sin entorno gráfico**: menos consumo y menos superficie de ataque.

### 1.2 Clientes

TriunfoTotal es una aplicación **web**: el cliente solo necesita un navegador moderno (Chrome, Firefox, Edge o Safari) en **cualquier** sistema operativo, sea Windows 10/11, macOS, Linux, Android o iOS. El diseño *mobile first* permite usarlo desde el celular, que es el dispositivo principal de jugadores y organizadores.

| Puesto | Sistema operativo recomendado | Motivo |
|---|---|---|
| Administrador del sistema | Ubuntu Desktop / Linux Mint (o Windows con cliente SSH) | Terminal nativa para administrar el servidor por SSH |
| Organizador (club o liceo) | El que ya tenga (Windows / ChromeOS) | Solo necesita un navegador |
| Jugadores y público | Android / iOS | Acceso desde el celular |

### 1.3 Hardware recomendado para el servidor

| Escenario | CPU | RAM | Disco | Observación |
|---|---|---|---|---|
| Mínimo (defensa, un club) | 2 núcleos | 2 GB | 40 GB SSD | VPS de ~USD 6/mes o PC reciclada |
| Recomendado (varias instituciones) | 4 núcleos | 8 GB | 2 × 240 GB SSD en RAID 1 | RAID 1: si falla un disco, no se pierden datos |
| Adicionales | — | — | Disco externo / NAS para respaldos | UPS para cortes de luz |

---

## 2. Análisis de usuarios del sistema

### 2.1 Usuarios del sistema operativo

| Usuario / grupo | Quién | Permisos | Cómo se crea |
|---|---|---|---|
| `root` | Nadie entra directamente | **Login por SSH deshabilitado** | — |
| grupo `triunfo-admin` | Administradores del servidor | `sudo`, `docker` y `adm` (lectura de logs) | `gestion_usuarios.sh crear <usuario> triunfo-admin` |
| grupo `triunfo-dev` | Desarrolladores | `docker` y `adm`, **sin sudo** | `gestion_usuarios.sh crear <usuario> triunfo-dev` |
| grupo `triunfo-backup` | Operador de respaldos | Solo `/var/backups/triunfototal` (setgid, 2770) | `gestion_usuarios.sh crear <usuario> triunfo-backup` |
| `www-data` | Apache, dentro del contenedor | Solo **lectura** del código (archivos de root, 644) | Imagen Docker |
| `mysql` | MariaDB, dentro del contenedor | Solo sus datos (volumen `db_data`) | Imagen Docker |

> **Nota:** ser del grupo `docker` equivale en la práctica a ser root (se puede montar `/` en un contenedor). Por eso solo se les da a administradores y desarrolladores de confianza.

### 2.2 Usuarios de la base de datos (DCL)

Ver `database/04_dcl.sh`:

- `app_triunfototal`: la aplicación, con permisos CRUD limitados.
- `backup_triunfototal`: los respaldos, solo lectura.
- `reportes_triunfototal`: monitoreo y consultas, solo lectura.
- `dba_triunfototal`: el administrador humano de la base.

### 2.3 Usuarios de la aplicación

Visitante, Usuario, Organizador (de un torneo puntual), Capitán (de un equipo) y Administrador. Ver el manual de usuario y `docs/ciberseguridad.md`, sección 4.

---

## 3. Scripts implementados (`scripts/`)

Todos están en **bash** y comparten funciones (`comun.sh`). Los que modifican el sistema exigen `sudo` y registran lo que hacen en `/var/log/triunfototal/`.

| Script | Qué hace | Ejemplo |
|---|---|---|
| `instalar.sh` | Instala Docker, genera `.env` con claves aleatorias, levanta los contenedores, instala el cron y (opcionalmente) endurece el servidor. | `sudo ./scripts/instalar.sh` |
| **`gestion_servidor.sh`** | **Script general**: menú con información del sistema, aplicación (iniciar, detener, logs, actualizar), monitoreo, respaldos, usuarios, consultas, seguridad, mantenimiento y alertas. | `sudo ./scripts/gestion_servidor.sh` |
| `gestion_usuarios.sh` | Crear (con contraseña temporal y vencimiento), eliminar (archivando su home), bloquear, desbloquear, resetear contraseña, cambiar de grupo, listar y aplicar la política de contraseñas. | `sudo ./scripts/gestion_usuarios.sh crear ana triunfo-dev` |
| `respaldo.sh` | Respaldos diario, semanal y mensual cifrados, hasheados y firmados; rotación; verificar; restaurar; instalar el cron. | `sudo ./scripts/respaldo.sh diario` |
| `monitoreo.sh` | CPU, RAM, discos, servicios, contenedores, API (HTTP + tiempo de respuesta), certificado, base y ataques. Escribe alertas en el log. | `sudo ./scripts/monitoreo.sh` |
| `consultas_bd.sh` | Estado de MariaDB, tamaño de tablas, conexiones, resumen, auditoría, seguridad, CHECK TABLE y exportación a CSV. | `./scripts/consultas_bd.sh tamanos` |
| `seguridad_servidor.sh` | UFW, fail2ban, SSH, ClamAV, sysctl, actualizaciones automáticas y estado. | `sudo ./scripts/seguridad_servidor.sh todo` |

Conceptos de bash usados (para la defensa):

- funciones y `source` (reutilizar código);
- `case` (menús y subcomandos);
- `while` y `for` (recorrer usuarios, archivos y contenedores);
- `if` con `[ ]` y `[[ =~ ]]` (validar con expresiones regulares);
- arrays y arrays asociativos (`declare -A RETENCION`);
- pipes (`tar | openssl`);
- redirecciones (`>>` a logs) y heredocs (`<<EOF`) para generar archivos de configuración;
- variables de entorno y `set -o pipefail`, para detectar errores dentro de un pipe.

---

## 4. Política de respaldos

### 4.1 Tipos y cronograma

| Tipo | Contenido | Frecuencia (cron) | Retención | Ubicación |
|---|---|---|---|---|
| **Diario** (completo de BD) | Volcado completo de la base: datos, triggers, procedimientos y vistas. | Todos los días a las **02:30** | 7 copias (1 semana) | `/var/backups/triunfototal/diario` |
| **Semanal** (completo) | Base + `.env`, `docker-compose.yml`, configuración de Docker y certificados SSL. | Domingos a las **03:00** | 4 copias (1 mes) | `…/semanal` |
| **Mensual** (archivo) | Igual que el semanal. | Día 1 de cada mes a las **04:00** | 6 copias (6 meses) | `…/mensual` |
| Antes de restaurar | Respaldo diario automático del estado actual. | Al restaurar | Según la rotación | `…/diario` |
| Copia externa (opcional) | Los tres tipos, por `rsync`. | Junto con cada respaldo | La que defina el destino | `DESTINO_REMOTO` (NAS u otro servidor) |

Se eligen **respaldos completos** en lugar de incrementales porque la base es chica: unos 600 KB sin comprimir y 70 KB comprimida y cifrada con los datos de prueba. Así cada copia es independiente y la restauración es de un solo paso.

Se aplica la **regla 3-2-1**: 3 copias (la base en uso más dos respaldos), en 2 medios distintos (disco del servidor y NAS), con 1 copia fuera del servidor.

**Ventanas horarias:** de madrugada, cuando no hay torneos en juego. Gracias a `--single-transaction`, el volcado **no bloquea** la aplicación.

Archivo de cron instalado (`/etc/cron.d/triunfototal`):

```
30 2 * * *  root  …/respaldo.sh diario
0  3 * * 0  root  …/respaldo.sh semanal
0  4 1 * *  root  …/respaldo.sh mensual
*/5 * * * * root  …/monitoreo.sh --cron
0  5 * * 1  root  …/seguridad_servidor.sh escanear
```

### 4.2 Seguridad de los respaldos

Los respaldos se **cifran con AES-256**, llevan un **hash SHA-256** y una **firma RSA**. Antes de restaurar, `respaldo.sh restaurar` verifica el hash y la firma; si no coinciden, **no restaura**. La clave de cifrado debe guardarse también **fuera del servidor** (por ejemplo, en un sobre o en un gestor de contraseñas): sin ella, los respaldos no se pueden abrir.

### 4.3 Pruebas de restauración

Una vez al mes se restaura el último respaldo semanal en un entorno de prueba y se ejecuta `tests/prueba_api.sh`. Un respaldo que nunca se probó no es un respaldo.

### 4.4 Plan de recuperación ante desastres

| Situación | Acción | Tiempo estimado |
|---|---|---|
| Se borró o se corrompió un dato | `respaldo.sh restaurar <último diario>` | 5 min |
| Falla del contenedor | `docker compose up -d` (los datos están en un volumen) | 1 min |
| Falla del disco | Instalar Ubuntu, `instalar.sh` y restaurar el respaldo externo | 1 h |

---

## 5. Monitoreo

Se usan dos niveles:

1. **`monitoreo.sh`** (cada 5 minutos por cron): controla umbrales y registra las **alertas** en `/var/log/triunfototal/monitoreo.log`. Si se define `MAIL_ALERTAS`, también avisa por mail. Umbrales configurables: CPU 85%, RAM 90%, disco 85%, 30 logins fallidos por hora, API lenta (más de 3 s), certificado a menos de 15 días de vencer, contenedores caídos o *unhealthy*, servicios detenidos.
2. **Netdata** (`docker compose --profile monitoreo up -d`): panel gráfico en tiempo real con CPU, RAM, disco, red y uso por contenedor. Por seguridad escucha solo en `127.0.0.1:19999`; se accede con un túnel SSH:

   ```bash
   ssh -L 19999:localhost:19999 usuario@servidor
   # y en el navegador: http://localhost:19999
   ```

Además, cada contenedor tiene un **healthcheck**: Docker sabe si la web responde y si MariaDB está lista, y los reinicia si se caen (`restart: unless-stopped`).

---

## 6. Políticas de seguridad del servidor

1. **Mínimo privilegio:** nadie trabaja como root; se usan grupos con los permisos justos.
2. **Acceso remoto solo por SSH:** sin root, máximo 3 intentos, sesiones que expiran y, preferentemente, solo con claves.
3. **Firewall con política "denegar todo"** salvo 22 (limitado), 80 y 443.
4. **Base de datos nunca expuesta:** sin puertos publicados, solo en la red interna de Docker.
5. **Parches de seguridad automáticos** (`unattended-upgrades`) y actualización mensual completa (menú Mantenimiento).
6. **Antivirus** con escaneo semanal del proyecto, `/home`, `/tmp` y los respaldos.
7. **Contraseñas** según la política (10+ caracteres, complejidad, vencimiento a los 90 días).
8. **Secretos fuera del código:** el `.env` tiene permisos 600 y no se sube a git.
9. **Logs revisados** semanalmente (opción 9 del menú general: "Ver últimas alertas").
10. **Respaldos** según la sección 4, con prueba de restauración mensual.

---

## 7. Implementación con Docker

Ver el detalle técnico en `docs/manual_tecnico.md`, sección 6.2. En resumen:

| Concepto | Implementación |
|---|---|
| **Imagen propia** | Construcción en dos etapas: Node compila React y `php:8.1-apache` sirve la app. |
| **Contenedores** | `triunfo_web` y `triunfo_db` (+ `triunfo_netdata` opcional). |
| **Redes** | `red_web` (pública) y `red_datos` (**interna**: la base no tiene salida ni entrada desde afuera). |
| **Volúmenes** | `db_data` (los datos sobreviven al borrar el contenedor), `ssl_certs` y `logs/apache` (bind mount que lee fail2ban). |
| **Variables de entorno** | Contraseñas y configuración desde `.env`; PHP las lee con `getenv()`. |
| **Healthchecks y reinicio automático** | `healthcheck.sh` en la base, `curl` a la API en la web y `restart: unless-stopped`. |
| **Inicialización** | Los scripts de `database/` se ejecutan solos la primera vez, en orden: esquema, datos, lógica y DCL. |

Comandos útiles:

```bash
docker compose ps                  # estado
docker compose logs -f web         # logs en vivo
docker compose exec db mariadb -u root -p triunfo_total_db   # consola SQL
docker compose down                # detener (los datos quedan en el volumen)
docker compose down -v             # detener Y BORRAR la base (reinstalar desde cero)
```
