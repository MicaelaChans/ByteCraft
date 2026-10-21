# Documentación de seguridad — TriunfoTotal

ByteCraft · 3° MO Nocturno · ITS Arias-Balparda · 2026

Este documento cubre lo pedido por la asignatura **Ciberseguridad** (1ª, 2ª y 3ª entrega) y la sección 8.3 de la letra:

- riesgos identificados;
- medidas aplicadas;
- roles y permisos;
- protección de credenciales;
- validaciones;
- auditoría;
- hashing, cifrado y firma digital;
- SSL;
- esquema de red;
- informe OWASP.

---

## 1. Activos a proteger

| Activo | Por qué importa |
|---|---|
| Credenciales de usuarios | Permitirían suplantar identidades (incluido un administrador). |
| Datos personales (email, teléfono, dirección, foto) | Están protegidos por la Ley 18.331 de Protección de Datos Personales (Uruguay). |
| Resultados y posiciones | Son la integridad de la competencia: alterarlos es "hacer trampa". |
| Registro de auditoría | Es la prueba de quién hizo qué. |
| Disponibilidad del servicio | Hay torneos en curso que dependen del sistema. |
| Respaldos | Contienen todo lo anterior. |

## 2. Amenazas identificadas

| # | Amenaza | Ejemplo concreto en TriunfoTotal | Impacto | Probabilidad |
|---|---|---|---|---|
| A1 | Fuerza bruta / credential stuffing | Probar miles de contraseñas contra `admin@…` | Alto | Alta |
| A2 | Inyección SQL | `' OR 1=1 --` en el buscador de torneos | Crítico | Media |
| A3 | XSS (Cross-Site Scripting) | Un torneo llamado `<script>robar()</script>` | Alto | Media |
| A4 | CSRF | Una página maliciosa que envía "aprobar torneo" usando la sesión del admin | Alto | Media |
| A5 | Escalada de privilegios / IDOR | Un usuario que carga resultados de un torneo ajeno cambiando el id en la URL | Alto | Alta |
| A6 | Robo de sesión | Interceptar la cookie en un Wi-Fi público | Alto | Media |
| A7 | Exposición de datos sensibles | Mensajes de error con rutas y SQL, o contraseñas en el repositorio | Medio | Alta |
| A8 | Manipulación de resultados | El organizador cambia un resultado después de cerrar la ronda | Medio | Media |
| A9 | Denegación de servicio | Inundación de peticiones o SYN flood | Medio | Baja |
| A10 | Pérdida de datos | Falla de disco, borrado accidental o ransomware | Crítico | Baja |
| A11 | Acceso no autorizado al servidor | Fuerza bruta por SSH o puertos abiertos innecesarios | Crítico | Media |
| A12 | Malware subido | Un archivo infectado disfrazado de avatar | Medio | Baja |

## 3. Vulnerabilidades posibles en la infraestructura

| Componente | Vulnerabilidad posible | Control aplicado |
|---|---|---|
| **Servidor** (Ubuntu) | Puertos abiertos, SSH con root, falta de parches | UFW (solo 22/80/443), SSH sin root y con 3 intentos, fail2ban, `unattended-upgrades`, sysctl endurecido |
| **Base de datos** | Expuesta a internet, usuario con todos los permisos, contraseñas débiles | Sin puertos publicados (red Docker interna), 4 usuarios con mínimo privilegio, contraseñas aleatorias de 24 caracteres |
| **Servidor web** | Listado de directorios, versión expuesta, archivos `.env`/`.git` accesibles | `Options -Indexes`, `ServerTokens Prod`, `expose_php = Off`, se bloquean los archivos que empiezan con punto, el código queda fuera de la carpeta pública |
| **Red interna** | Tráfico sin cifrar, equipos sin segmentar | HTTPS obligatorio (TLS 1.2+), HSTS, red de datos de Docker aislada (`internal: true`) |
| **Respaldos** | Robo o alteración de las copias | Cifrado AES-256, hash SHA-256, firma RSA y permisos 640 |

## 4. Controles de acceso y roles

Se usa un control de acceso **basado en roles dinámicos**, más la verificación de **propiedad del recurso**:

| Rol / condición | Puede |
|---|---|
| Visitante (sin login) | Ver torneos aprobados, fixture, llaves, tablas y participantes. No puede modificar nada. |
| **Usuario** (rol base) | Además: editar su perfil, crear equipos, inscribirse y **crear torneos**. |
| **Organizador** (dueño de *ese* torneo) | Gestionar *su* torneo: inscripciones, iniciar, cargar resultados y cerrar rondas. |
| **Capitán** (de *ese* equipo) | Administrar su equipo e inscribirlo. |
| **Administrador** | Aprobar o rechazar torneos formales, banear usuarios, asignar el rol admin, habilitar módulos, ver auditoría y corregir resultados de rondas cerradas. |

**Implementación:**

- **Todo** se valida en el **backend**, en cada petición. Ocultar un botón en React es solo comodidad visual.
- Los roles **se leen de la base en cada petición**, no se guardan en la sesión. Si el admin banea a alguien o le saca un rol, el cambio aplica al instante y su sesión se corta.
- **Protección IDOR:** cada acción sobre un recurso verifica que el usuario sea su dueño. Por ejemplo, `TorneoController::cargarParaGestionar()` controla que sea el organizador de *ese* torneo, `Notificacion::marcarLeida()` agrega `AND id_usuario = ?`, y una invitación a un equipo solo la puede responder la persona invitada (se busca por el usuario de la sesión, nunca por un id que venga en la petición).
- **Consentimiento:** nadie queda en un equipo sin aceptar la invitación.
- Reglas para no quedarse sin control: el admin no puede banearse a sí mismo y no se puede quitar el último administrador.

## 5. Política de contraseñas

| Aplicación web | Sistema operativo (servidor) |
|---|---|
| Mínimo **8** caracteres (máximo 72, por el límite de bcrypt) | Mínimo **10** caracteres (`pam_pwquality`) |
| Al menos una mayúscula, una minúscula y un número | Mayúscula, minúscula, número y **símbolo** |
| Se valida en el frontend y **otra vez en el backend** (`Validador::password`) | Vencen cada **90 días**, con aviso 7 días antes (`chage`) |
| Bloqueo de 15 minutos tras **5 fallos** por cuenta o **20** por IP | Bloqueo de IP tras **3 fallos** de SSH durante 24 h (fail2ban) |
| Cambio de contraseña pidiendo la actual | Contraseña temporal aleatoria que hay que cambiar en el primer ingreso |

Recomendaciones para los usuarios: usar un gestor de contraseñas, no reutilizar contraseñas y nunca compartirlas.

## 6. Validaciones implementadas

| Dato | Frontend (React) | Backend (PHP) | Base de datos |
|---|---|---|---|
| Email | Formato con regex | `filter_var(FILTER_VALIDATE_EMAIL)`, máximo 150, se guarda en minúsculas; el **dominio debe tener registro MX** (recibir correo); y la casilla se confirma con un **link de verificación** | `UNIQUE` |
| Contraseña | Política (8, mayúscula, minúscula, número) | Misma política | Solo se guarda el hash |
| Nombre de torneo | 3 a 100 caracteres | 3 a 100 caracteres | `NOT NULL`, `VARCHAR(100)` |
| Cantidad de participantes | 2 a 128 | 2 a 128 y no menor que los ya inscriptos | `CHECK (max_equipos BETWEEN 2 AND 128)` |
| Fechas | Fin ≥ inicio | Formato `AAAA-MM-DD` real, fin ≥ inicio, inicio no en el pasado | `CHECK (fecha_fin >= fecha_inicio)` |
| Resultados | Números ≥ 0 | Enteros 0-999; sin empate en eliminación; ronda cerrada solo la corrige el admin | `CHECK (goles >= 0)` |
| Formato / modalidad / tipo | Select con valores fijos | Lista blanca (`Validador::opcion`) | `ENUM` + FK a `modulos` |
| Alias | — | Solo `[A-Za-z0-9_.]`, 3 a 30 caracteres, único | `UNIQUE` |
| Teléfono | — | Solo números, espacios, `+ - ( )` | `VARCHAR(20)` |
| Avatar | Imagen, máximo 1,4 MB | Solo `data:image/(png|jpg|webp|gif);base64`, máximo ~2 MB | `MEDIUMTEXT` |
| Cuerpo de la petición | — | JSON válido; los POST/PUT/DELETE con cuerpo exigen `Content-Type: application/json` | — |

Los errores se devuelven por campo (HTTP 422) y React los muestra debajo de cada input, con mensajes claros que explican cómo corregirlos.

## 7. Hashing, cifrado y firma digital

| Técnica | Dónde se aplica | Cómo |
|---|---|---|
| **Hashing de contraseñas** | Tabla `usuarios` | `password_hash(PASSWORD_DEFAULT)` = **bcrypt** con sal aleatoria por usuario y costo 10. Es lento a propósito, para frenar la fuerza bruta. Se re-hashea solo si PHP sube el algoritmo (`password_needs_rehash`). El hash nunca sale del modelo ni aparece en la auditoría. |
| **Hashing de integridad** | Respaldos | **SHA-256** de cada archivo: si cambia un solo bit, el hash no coincide. Probado en el proyecto alterando un byte. |
| **Cifrado en tránsito** | Navegador ↔ servidor | **TLS 1.2/1.3** (HTTPS). El puerto 80 redirige al 443. **HSTS** obliga al navegador a usar siempre HTTPS. |
| **Cifrado en reposo** | Respaldos | **AES-256-CBC** con derivación de clave **PBKDF2** (200.000 iteraciones) y sal. La clave está en `/root/.triunfototal/respaldo.key` con permisos 600. |
| **Firma digital** | Respaldos | **RSA 3072 + SHA-256** (`openssl dgst -sign`). Antes de restaurar se verifica con la clave pública: prueba que el respaldo lo generó este servidor y que nadie lo modificó (**autenticidad + integridad + no repudio**). |
| **Token de verificación de email** | Registro | `random_bytes(32)` (criptográficamente seguro). En la base se guarda solo su **hash SHA-256**: si alguien robara la base, no podría usar los links. Vence a las 24 h y es de un solo uso. |
| **Correo cifrado** | Envío de mails | El cliente SMTP usa **STARTTLS** (TLS 1.2/1.3) antes de enviar la contraseña de aplicación de Gmail. |
| **Prevención de enumeración** | Login y reenvío de verificación | Si el email no existe igual se calcula un bcrypt, para que la respuesta tarde lo mismo. El mensaje es genérico ("email o contraseña incorrectos"). |

## 8. Certificado SSL

- **Desarrollo / defensa:** al arrancar, el contenedor genera un certificado **autofirmado** RSA 2048, válido por 365 días, con el nombre del servidor en el SAN (`docker/web/entrypoint.sh`).
- **Producción con dominio:** se usa **Let's Encrypt** (gratis, se renueva solo):

  ```bash
  sudo apt install certbot
  sudo certbot certonly --standalone -d triunfototal.com.uy
  ```

  Después se copian `fullchain.pem` y `privkey.pem` al volumen `ssl_certs` como `triunfo.crt` y `triunfo.key`.
- Configuración de Apache: solo `TLSv1.2` y `TLSv1.3`, HSTS de 1 año y redirección forzada de HTTP a HTTPS.
- `monitoreo.sh` avisa 15 días antes de que venza el certificado.

## 9. Registro de auditoría

- **Qué se registra:** todo INSERT, UPDATE y DELETE sobre usuarios, roles, torneos, equipos, miembros, inscripciones, rondas, partidos y módulos (20 triggers), más los eventos de sesión `LOGIN`, `LOGIN_FALLIDO` y `LOGOUT`.
- **Con qué datos:** quién (`id_usuario`, que PHP pasa con `SET @app_id_usuario`), desde dónde (IP), cuándo, qué tabla, qué registro y el antes/después en JSON (por ejemplo, el resultado `1-1 Pendiente → 2-1 Finalizado`).
- **Inmutable desde la app:** el usuario de base de la aplicación **no tiene permiso** de UPDATE ni DELETE sobre `auditoria`. Está probado: devuelve `ERROR 1142 DELETE command denied`.
- **Consulta:** en Panel admin → Auditoría, con filtros por tabla, acción, usuario y fechas, paginado y exportación a **CSV**. También con `scripts/consultas_bd.sh auditoria`.
- **Logs del servidor:** Apache (`logs/apache/access.log`, que usa fail2ban), `/var/log/triunfototal/*.log` (respaldos, monitoreo, usuarios, seguridad) y `auth.log` del sistema.

## 10. Esquema de red con implementaciones de seguridad

```
                    INTERNET
                        │
                ┌───────▼────────┐
                │ Router / NAT   │  solo reenvía 80 y 443 (y SSH si se administra de afuera)
                └───────┬────────┘
                        │
   ┌────────────────────▼─────────────────────────────────────────────┐
   │ SERVIDOR UBUNTU                                                  │
   │  ┌──────────────────────────────────────────────────────────┐   │
   │  │ UFW (iptables): deny incoming · allow 80, 443 · limit 22 │   │
   │  │ fail2ban: sshd · triunfototal-login · apache-badbots     │   │
   │  │           (bans en INPUT y en DOCKER-USER)               │   │
   │  └──────────────────────────────────────────────────────────┘   │
   │                                                                  │
   │   red_web (bridge)                    red_datos (internal)       │
   │  ┌──────────────────────┐            ┌──────────────────────┐   │
   │  │ triunfo_web          │◄──────────►│ triunfo_db           │   │
   │  │ Apache + PHP         │  3306 solo │ MariaDB              │   │
   │  │ :80 → :443 (TLS)     │  interno   │ SIN puertos públicos │   │
   │  └──────────────────────┘            └──────────────────────┘   │
   │  Netdata 127.0.0.1:19999 (solo por túnel SSH)                    │
   │  ClamAV (escaneo semanal) · respaldos cifrados en /var/backups   │
   └──────────────────────────────────────────────────────────────────┘
          │ rsync (opcional): copia de respaldos FUERA del servidor (regla 3-2-1)
          ▼
     Servidor/NAS externo
```

**Red interna de la organización** (si el sistema se instala en un club o liceo):

- **VLAN separadas:** servidores, administración y Wi-Fi de invitados (los invitados no ven el servidor).
- **DHCP** con reservas por MAC para el servidor y las impresoras. El servidor tiene IP fija.
- **Wi-Fi WPA3** (o WPA2-AES) con una contraseña distinta para invitados.
- **UPS** para el servidor y el router: evita la corrupción de la base ante cortes de luz.

## 11. IDS / IPS y registro de implementaciones

| Herramienta | Tipo | Configuración | Script |
|---|---|---|---|
| **UFW / iptables** | Firewall | Política por defecto `deny`. Solo 80/443 y SSH con `limit` (6 conexiones en 30 s). | `seguridad_servidor.sh firewall` |
| **fail2ban** | IPS | `sshd` (3 fallos → 24 h), `triunfototal-login` (10 respuestas 401/429 al login en 10 min → 1 h), `apache-badbots`. Los baneos de la web se aplican en la cadena `DOCKER-USER`, porque Docker no usa la cadena INPUT. | `seguridad_servidor.sh fail2ban` |
| **Bloqueo en la aplicación** | IPS de capa 7 | Tabla `intentos_login`: 5 fallos por cuenta o 20 por IP en 15 min → HTTP 429. | `IntentoLogin.php` |
| **ClamAV** | Antivirus | Firmas actualizadas por `freshclam` y escaneo semanal por cron (lunes 05:00). | `seguridad_servidor.sh antivirus` |
| **Netdata + monitoreo.sh** | Detección | Alertas de CPU, RAM y disco, servicios caídos, API lenta y picos de logins fallidos. | `monitoreo.sh` |
| **sysctl** | Kernel | SYN cookies, `rp_filter` (anti spoofing), sin redirects ICMP, registro de paquetes marcianos. | `seguridad_servidor.sh kernel` |
| **unattended-upgrades** | Parches | Instala solo las actualizaciones de seguridad. | `seguridad_servidor.sh updates` |

## 12. Políticas de seguridad de usuario

1. Cada persona tiene **su propia cuenta**; está prohibido compartir credenciales.
2. Las contraseñas cumplen la política de la sección 5.
3. El rol administrador se asigna solo a quien lo necesita (**mínimo privilegio**) y se revisa cada mes.
4. Las cuentas inactivas o que violan los Términos de Servicio se **banean** (bloqueo reversible, conservando el historial).
5. La sesión expira tras **2 horas** de inactividad o al cerrar el navegador.
6. En pantallas públicas, el email y el teléfono se muestran **enmascarados** (`maskData.js`).
7. Los usuarios del servidor se crean con `gestion_usuarios.sh`, que asigna el grupo con los permisos justos.
8. Ante un incidente (cuenta comprometida): banear la cuenta, revisar la auditoría, forzar el cambio de contraseña y, si corresponde, restaurar un respaldo verificado.

## 13. Informe OWASP Top 10 (2021)

| Riesgo OWASP | ¿Aplica? | Medidas en TriunfoTotal | Cómo se verifica |
|---|---|---|---|
| **A01 Broken Access Control** | Sí | Permisos verificados en el backend en cada petición; control de propiedad (organizador/capitán); admin por rol leído de la base; las rondas cerradas solo las corrige el admin. | `prueba_api.sh`: un participante no puede aceptar inscripciones (403), el organizador no puede autoaprobarse (403), usuario común en `/admin` (403). |
| **A02 Cryptographic Failures** | Sí | bcrypt, TLS 1.2+, HSTS, AES-256 en respaldos, cookie `Secure`; el hash nunca se envía al front. | Inspeccionar `usuarios.password_hash` (`$2y$…`); `openssl s_client`. |
| **A03 Injection** | Sí | PDO con **sentencias preparadas nativas** en el 100% de las consultas; listas blancas para ENUM/orden; React escapa todo lo que muestra (no se usa `dangerouslySetInnerHTML`). | Buscar `' OR 1=1 --` → 0 resultados, sin error. |
| **A04 Insecure Design** | Sí | Reglas de negocio en el backend **y** en la base (triggers); estados del torneo controlados; no se cierra una ronda con partidos pendientes. | Pruebas 409 en `prueba_api.sh`. |
| **A05 Security Misconfiguration** | Sí | `display_errors = Off`, `expose_php = Off`, `ServerTokens Prod`, `-Indexes`, cabeceras de seguridad, CSP, código fuera de la carpeta pública, funciones peligrosas de PHP deshabilitadas. | `curl -I https://servidor` muestra las cabeceras. |
| **A06 Vulnerable Components** | Sí | Imágenes oficiales con versión fija (php:8.1, mariadb:10.6), `npm audit`, actualizaciones automáticas del sistema operativo. | `npm audit`, `docker scout`. |
| **A07 Identification & Auth Failures** | Sí | Política de contraseñas, bloqueo por intentos (429), mensajes genéricos, `session_regenerate_id` al loguearse (anti fixation), expiración por inactividad, la cookie no es accesible por JavaScript. | Prueba "tras 5 intentos fallidos → 429". |
| **A08 Software & Data Integrity** | Sí | Respaldos firmados y hasheados; el frontend se compila dentro de la imagen; Bootstrap se carga desde CDN con `integrity` (SRI). | `respaldo.sh verificar` detecta un byte alterado. |
| **A09 Logging & Monitoring Failures** | Sí | Auditoría completa e inmutable, logs de Apache, `monitoreo.sh` con alertas y Netdata. | Panel admin → Auditoría; `/var/log/triunfototal/monitoreo.log`. |
| **A10 SSRF** | Bajo | La aplicación no hace peticiones a URLs que provengan del usuario. | — |

**Otras protecciones:**

- **CSRF:** cookie `SameSite=Strict`, más la exigencia de `Content-Type: application/json` en peticiones con cuerpo, más el control del encabezado `Origin`. Probado: un formulario que no es JSON devuelve 415.
- **Clickjacking:** `X-Frame-Options: DENY` y `frame-ancestors 'none'`.
- **XSS:** React escapa por defecto, hay una CSP que solo permite scripts propios y de `cdn.jsdelivr.net`, y la cookie es `httpOnly`.

### Hallazgos y mejoras pendientes (honestidad técnica)

| Hallazgo | Riesgo | Acción |
|---|---|---|
| Versiones anteriores del repositorio tenían `config/Conexion.php` con la contraseña real de la base. | Medio | Ya se quitó: ahora se usan variables de entorno y `config.local.php` ignorado por git. **Hay que cambiar esa contraseña**, porque sigue en el historial de git. |
| El certificado de la defensa es autofirmado. | Bajo | En producción, usar Let's Encrypt. |
| No hay segundo factor de autenticación (2FA). | Medio | Mejora futura: TOTP para administradores. |
| Los avatares se guardan en base64 dentro de la base. | Bajo | Mejora futura: almacenamiento de archivos con escaneo antivirus. |
