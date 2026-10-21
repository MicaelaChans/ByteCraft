# Guía para la defensa 🎓

Esta guía es para que **entiendas y puedas explicar** cada parte del proyecto. Te recomiendo leerla con el código abierto al lado.

---

## Plan de estudio sugerido (10 días)

| Día | Tema | Archivos para leer |
|---|---|---|
| 1 | Recorrer la app como usuario, organizador y admin | La app funcionando + `docs/manual_usuario.md` |
| 2 | MVC y el camino de una petición | `api/index.php`, `app/core/App.php`, `Router.php`, `app/rutas.php` |
| 3 | Controladores y permisos | `TorneoController.php`, `InscripcionController.php`, `Sesion.php` |
| 4 | Modelos y SQL | `Modelo.php`, `Usuario.php`, `Torneo.php`, `Partido.php` |
| 5 | Los 3 módulos de competencia ⭐ | `app/modulos/*.php` (practicá a mano en papel) |
| 6 | Base de datos: esquema, vistas, triggers, DCL | `database/01_esquema.sql`, `03_logica.sql`, `04_dcl.sh` |
| 7 | React: cómo se comunica con la API | `src/services/api.js`, `App.jsx`, `TournamentDetail.jsx`, `GestionarTorneo.jsx` |
| 8 | Docker y scripts de Sistemas Operativos | `docker-compose.yml`, `docker/web/Dockerfile`, `scripts/*.sh` |
| 9 | Ciberseguridad y OWASP | `docs/ciberseguridad.md` |
| 10 | Simulacro: responder las preguntas de abajo en voz alta | Esta guía |

---

## Preguntas probables y cómo responderlas

### Arquitectura / Programación

**¿Qué es MVC y cómo lo aplicaron?**
> Es separar el código en tres responsabilidades. El **Modelo** (`app/models`) es el único que habla con la base. La **Vista** es React, que muestra los datos. El **Controlador** (`app/controllers`) recibe la petición, valida datos y permisos, le pide al modelo lo que necesita y responde JSON. Todo entra por un único archivo, `api/index.php` (el *front controller*), y el `Router` decide qué controlador atiende cada ruta.

**¿Por qué React si la letra dice HTML, CSS y JS?**
> React *es* JavaScript que genera HTML, con CSS propio y de Bootstrap. Lo elegimos para reutilizar componentes (por ejemplo `TorneoCard`, `Llave` o `TablaPosiciones`) y para que la app sea más fluida (SPA). Se comunica con PHP mediante una API JSON y peticiones asíncronas (`fetch`).

**¿Cómo evitan la inyección SQL?**
> Con PDO y **sentencias preparadas** en todas las consultas: el SQL lleva `?` y los datos viajan por separado, así que nunca se ejecutan como código. Además desactivamos la emulación (`ATTR_EMULATE_PREPARES = false`) para que la base haga la preparación real.

**¿Dónde se valida?**
> En tres lugares. En el **frontend**, para dar una respuesta rápida al usuario. En el **backend** (`Validador.php`), que es la validación que importa, porque cualquiera puede mandar peticiones con curl. Y en la **base**, con CHECK, UNIQUE, FK y ENUM.

**¿Qué es el "manejo centralizado de errores"?**
> Cualquier parte del código hace `throw new HttpError(403, 'mensaje')` y `App.php` lo atrapa en un solo `try/catch`, devolviendo JSON con el código correcto. Los errores internos se guardan en el log y al usuario solo le llega un mensaje genérico.

**Explicá el algoritmo de la liga.**
> Es el **método del círculo**. Con 4 equipos A, B, C y D, se fija A y los demás rotan: jornada 1, A-D y B-C; jornada 2, A-C y D-B; jornada 3, A-B y C-D. Cada uno juega contra todos una vez. Con *n* equipos son *n − 1* jornadas. Si son impares, se agrega un "fantasma" y quien le toca contra él descansa esa fecha. Con ida y vuelta se repiten las jornadas invirtiendo la localía.

**¿Y la eliminación con 5 equipos?**
> La llave necesita una potencia de 2, así que se usa una de 8. Sobran 3 lugares, y esos 3 equipos reciben **BYE**: pasan directo a la siguiente ronda. La primera ronda es "Cuartos de final", con un partido real y 3 BYE. Al cerrar una ronda se emparejan los ganadores en orden. No hay empates.

**¿Y el suizo?**
> Se juegan log₂(n) rondas redondeado hacia arriba: con 8 jugadores, 3 rondas. La ronda 1 es por sorteo. Después se ordena por puntos y se empareja a cada uno con el más cercano en la tabla **con el que no haya jugado**. Si un emparejamiento deja a alguien sin rival válido, se vuelve atrás y se prueba otro (*backtracking*). Si son impares, descansa el último de la tabla que todavía no descansó, y eso cuenta como victoria.

**¿Cómo se calcula la tabla de posiciones?**
> La calcula la **base de datos**. Cada vez que se guarda o corrige un resultado, el trigger `trg_partidos_au` llama al procedimiento `sp_recalcular_posiciones`, que recalcula todo **desde cero** con los puntos configurados en ese torneo. Por eso corregir un resultado nunca duplica puntos.

**¿Qué patrones de diseño usaron?**
> - **Singleton** en `Conexion`: una sola conexión por petición.
> - **Front Controller** en `api/index.php`.
> - **Factory**: `ModuloCompetencia::para($formato)` devuelve el módulo correcto.
> - **Herencia y polimorfismo**: los 3 módulos heredan de una clase abstracta.
> - **MVC**.

### Roles dinámicos (tu decisión — defendela bien)

**¿Por qué no hay un rol "Organizador" como dice la letra?**
> Porque en la realidad cualquier persona puede querer organizar un torneo entre amigos sin pedirle permiso a nadie. "Organizador" no es un rol global: es ser el dueño de *ese* torneo (`torneos.id_organizador`). Así un usuario puede organizar un torneo y jugar en otro. Para no perder control, los torneos **formales** sí pasan por el administrador. Esa regla está en el **backend** y además en un **trigger** de la base, así que no se puede saltear.

**¿Cómo sabe el sistema qué puede hacer cada uno?**
> En cada petición se lee el usuario de la sesión y sus roles **desde la base**. `Sesion::exigirAdmin()` controla el rol, y `TorneoController::puedeGestionar()` controla que sea el dueño del torneo. Si el admin banea a alguien, la sesión se le corta en la siguiente petición.

### Base de datos

**¿Está normalizada?**
> Sí, en 3FN. Por ejemplo, los roles están en una tabla aparte con una relación N a N (`usuario_roles`), y las disciplinas también tienen su tabla en lugar de ser texto repetido. No hay datos derivados guardados a mano: las posiciones las calcula un procedimiento.

**¿Qué es el DCL que hicieron?**
> Creamos 4 usuarios de base con **mínimo privilegio**. El de la aplicación puede hacer CRUD solo en las tablas que usa y **no puede borrar la auditoría** ni hacer DROP. El de respaldos solo lee. El de reportes solo lee. El DBA administra solo esta base. Lo probamos: un `DELETE FROM auditoria` con el usuario de la app da `ERROR 1142`.

**¿Cómo cumplen que "quede registrado cualquier cambio en la base"?**
> Con 20 **triggers** que, en cada INSERT, UPDATE o DELETE, escriben en la tabla `auditoria` quién lo hizo, desde qué IP, cuándo y qué cambió. PHP le avisa a la base quién es el usuario con `SET @app_id_usuario`. También se registran los logins y los intentos fallidos. Se consulta desde el panel de admin y se exporta a CSV.

**¿Qué hace una vista?**
> Es una consulta guardada. `v_torneos_publicos` junta torneo, disciplina, organizador y cantidad de inscriptos, así el listado no repite ese JOIN cada vez.

**¿Qué es una transacción y dónde la usan?**
> Es un conjunto de operaciones que se hacen todas o ninguna. Por ejemplo, al iniciar un torneo se rechazan los pendientes, se crean las rondas y los partidos y se cambia el estado. Si algo falla en el medio, se deshace todo (`Modelo::transaccion`).

### Ciberseguridad

**¿Cómo guardan las contraseñas?**
> Con `password_hash`, que usa **bcrypt** con una sal aleatoria por usuario. Es un hash, no un cifrado: no se puede revertir. Es lento a propósito, para que la fuerza bruta sea impráctica.

**¿Diferencia entre hash, cifrado y firma?**
> - **Hash**: una huella de una sola vía (contraseñas con bcrypt, integridad de respaldos con SHA-256).
> - **Cifrado**: es reversible con la clave (HTTPS/TLS en tránsito, AES-256 en los respaldos).
> - **Firma digital**: se hace con la clave **privada** y se verifica con la **pública**. Prueba quién generó el archivo y que nadie lo modificó; la usamos en los respaldos con RSA.

**¿Cómo se protegen de la fuerza bruta?**
> En la aplicación, después de 5 fallos por cuenta o 20 por IP en 15 minutos, se responde 429. En el servidor, **fail2ban** lee los logs de Apache y de SSH y banea la IP en el firewall. Y el mensaje de error no dice si el email existe.

**¿Cómo saben que el email de un usuario es real?**
> En dos pasos. Primero, el backend consulta el DNS y verifica que el dominio tenga **registro MX**, o sea, que reciba correo: así se frena `x@dominioinventado.com`. Pero eso no alcanza, porque `x@lala.com` tiene MX y la casilla igual puede no existir. Por eso, segundo, mandamos un **email con un link** que tiene un token aleatorio de 64 caracteres. Hasta que no lo tocás, no podés iniciar sesión. En la base guardamos solo el **hash SHA-256** del token, vence a las 24 h y se borra al usarse. El envío lo hace un cliente **SMTP** que programamos nosotros, con cifrado **STARTTLS**, usando el Gmail del proyecto con una contraseña de aplicación.

**¿Y si el mail no llega o el servidor no tiene internet?**
> El administrador puede verificar la cuenta a mano desde el panel. Y si no hay correo configurado (`CORREO_MODO=ninguno`), la verificación se desactiva sola para que el sistema siga funcionando.

**¿Cómo se suma gente a un equipo?**
> Con **invitaciones**: el capitán invita por email o alias, al invitado le llega una notificación y acepta o rechaza. Solo al aceptar pasa a `equipo_miembros`. Así nadie queda en un equipo sin su consentimiento. El backend busca la invitación con el usuario **de la sesión**, así que nadie puede aceptar por otro. Exigimos que sean usuarios registrados porque la letra dice que el participante inicia sesión y consulta sus torneos, y así reciben notificaciones y tienen su historial.

**¿Cómo funcionan los seguidores?**
> Cualquier usuario puede seguir a otro desde su perfil público. Cuando un organizador **publica** un torneo (si es informal, al crearlo; si es formal, recién cuando el admin lo aprueba), les llega un aviso a todos sus seguidores. El aviso se genera con **un solo** `INSERT … SELECT` desde la tabla `seguidores`, sin un bucle en PHP, así escala aunque tenga miles de seguidores. Seguir es idempotente (`INSERT IGNORE`) y nadie se puede seguir a sí mismo. El perfil público nunca expone email ni teléfono. Como "reputación" mostramos datos que no se pueden inventar: torneos organizados, finalizados y participaciones, calculados de la base.

**¿Por qué no hicieron login con Google?**
> Lo evaluamos y lo descartamos: la letra excluye la integración con redes sociales, depende de un servicio externo y de tener un dominio propio (Google no acepta direcciones IP). Priorizamos un login propio seguro.

**¿Y XSS y CSRF?**
> - **XSS**: React escapa todo lo que muestra, hay una cabecera CSP que solo permite scripts propios y la cookie de sesión es `httpOnly` (JavaScript no la puede leer).
> - **CSRF**: la cookie es `SameSite=Strict` y la API solo acepta JSON, y un formulario de otro sitio no puede mandar JSON. Además controlamos el encabezado `Origin`.

**Contame del OWASP Top 10.**
> Ver la tabla en `docs/ciberseguridad.md`, sección 13. Lo más importante: A01 (control de acceso en backend), A03 (sentencias preparadas), A07 (bloqueo por intentos y política de contraseñas) y A09 (auditoría y monitoreo).

### Sistemas Operativos

**¿Por qué Ubuntu Server?**
> Es gratis, tiene soporte de 5 años y funciona muy bien con Docker. Se instala sin entorno gráfico, lo que significa menos recursos y menos superficie de ataque. Ver la comparación en `docs/sistemas_operativos.md`.

**¿Qué hace Docker y por qué?**
> Empaqueta la app con todo lo que necesita (Apache, PHP, MariaDB), así funciona igual en cualquier máquina. Usamos 2 contenedores. La base está en una **red interna**, sin puertos hacia afuera. Los datos viven en un **volumen**, así que sobreviven aunque se borre el contenedor. Las contraseñas llegan por **variables de entorno** desde `.env`.

**Explicá la política de respaldos.**
> Hacemos uno diario de la base (guardamos 7), uno semanal con base y configuración (guardamos 4) y uno mensual (guardamos 6), programados con **cron** de madrugada. Cada respaldo se cifra con AES-256, se le calcula un hash SHA-256 y se firma con RSA; antes de restaurar se verifica. Opcionalmente se copia fuera del servidor (regla 3-2-1).

**¿Qué monitorean?**
> CPU, RAM, disco, servicios, contenedores, si la API responde y en cuánto tiempo, el vencimiento del certificado y los logins fallidos. Si algo pasa un umbral, se escribe una ALERTA en el log (cada 5 minutos por cron). Para ver gráficos en tiempo real usamos Netdata.

**Leeme este pedazo de script.**
> Practicá explicar `respaldo.sh`, la función `respaldar`: `mariadb-dump`, luego `tar | openssl enc` (pipe), luego `sha256sum`, `openssl dgst -sign` y la rotación con `ls -t | tail`. Y `gestion_usuarios.sh crear_usuario`: `useradd`, `chpasswd` y `chage -d 0`.

---

## Demo recomendada para la defensa (≈ 8 minutos)

1. **Público**: Inicio → Torneos → filtrar por "Eliminación" → abrir uno finalizado y mostrar la **llave** y el campeón.
2. **Login** con `carlos@triunfototal.com` / `Prueba1234` → **Crear torneo** formal de liga, de 4 participantes.
3. Mostrar que queda **pendiente** → cerrar sesión → entrar como `admin@triunfototal.com` / `Admin1234` → **Admin → Torneos a aprobar** → aprobar.
4. Volver como Carlos → **Gestionar** → inscribir 4 equipos directamente → **Iniciar** → cargar resultados → **Cerrar ronda** → mostrar que la tabla se actualiza.
5. Como admin → **Auditoría**: filtrar `partidos / UPDATE` y mostrar quién cargó cada resultado.
6. Terminal: `sudo ./scripts/gestion_servidor.sh`, luego monitoreo y luego respaldo + verificar.
7. Seguridad: intentar 6 logins incorrectos → mensaje de bloqueo (429).

**Antes de la defensa:** probá la instalación completa en una máquina virtual limpia con Ubuntu Server (`sudo ./scripts/instalar.sh`).
