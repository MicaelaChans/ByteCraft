# TriunfoTotal — Sistema de Gestión Deportiva Modular (SGDM)

*"Todos los juegos, una sola pasión."*

Plataforma web para organizar, administrar y seguir torneos deportivos, mentales y electrónicos en formato **liga**, **eliminación directa** o **sistema suizo**.

Proyecto de Bachillerato Tecnológico — Tecnologías de la Información | 3° año.
Instituto Tecnológico Superior "Arias - Balparda" — 2026. Grupo **ByteCraft**.

## Funcionalidades

- **Usuarios y autenticación** con roles dinámicos: cualquier usuario puede organizar. Los torneos **formales** los aprueba un administrador; los **informales** se publican al instante.
- **Equipos y participantes**: equipos con capitán, o participantes individuales.
- **Torneos**: creación, inscripciones (solicitud o inscripción directa), cupos y fechas.
- **Módulos de competencia** que generan los enfrentamientos automáticamente:
  - **Liga**: fixture todos contra todos (método del círculo), con ida y vuelta opcional.
  - **Eliminación directa**: llave con BYE automáticos.
  - **Suizo**: emparejamiento por puntaje sin repetir rivales.
- **Resultados** con tabla de posiciones calculada por la base de datos, llaves y campeón.
- **Consulta pública** de torneos, fixture, resultados y posiciones, sin necesidad de cuenta.
- **Panel de administración**: aprobación de torneos, usuarios (baneo y roles), módulos, estadísticas y **auditoría** completa (con exportación CSV).
- **Notificaciones** internas.
- **Seguridad**: bcrypt, sentencias preparadas, protección contra fuerza bruta, CSRF y XSS, HTTPS y auditoría inmutable (ver `docs/ciberseguridad.md`).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite, React Router, Redux Toolkit, Bootstrap 5 (mobile first) |
| Backend | PHP 8.1 con POO, patrón MVC, API REST JSON |
| Base de datos | MariaDB 10.6 / MySQL (triggers, procedimientos, vistas, DCL) |
| Infraestructura | Docker + Docker Compose, Apache 2.4 con TLS, Ubuntu Server |

## Instalación rápida (Docker, Ubuntu Server)

```bash
sudo ./scripts/instalar.sh
```

O de forma manual:

```bash
cp .env.example .env        # completar las contraseñas
docker compose up -d --build
```

La aplicación queda en `https://localhost`. Usuarios de prueba:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin@triunfototal.com` | `Admin1234` | Administrador general |
| `pablo.admin@triunfototal.com` | `PabloAdmin1234` | Administrador |
| `micaela.admin@triunfototal.com` | `MicaAdmin1234` | Administrador |
| `federico.admin@triunfototal.com` | `FedeAdmin1234` | Administrador |
| `claudio.admin@triunfototal.com` | `ClaudioAdmin1234` | Administrador |
| `carlos@triunfototal.com` | `Prueba1234` | Usuario (organizador de varios torneos) |
| Resto de los usuarios de prueba | `Prueba1234` | Usuario |

## Desarrollo local (sin Docker)

1. Cargar `database/01_esquema.sql`, `02_datos_prueba.sql` y `03_logica.sql` en MariaDB, y crear los usuarios con `database/04_dcl.sh`.
2. Copiar `config/config.local.php.example` a `config/config.local.php` y completarlo.
3. Servir la carpeta `api/` con Apache en `http://localhost/api`.
4. Levantar el frontend:

   ```bash
   npm install
   npm run dev      # http://localhost:5173 (Vite redirige /api a Apache)
   ```

## Pruebas

```bash
BASE=http://localhost/api/index.php ./tests/prueba_api.sh    # 60 pruebas funcionales
```

## Estructura

```
api/            Front controller (único PHP público)
app/            Backend MVC: core/, controllers/, models/, modulos/ (Liga, Eliminación, Suizo), rutas.php
config/         Conexión a la base (credenciales por variables de entorno)
database/       Esquema, datos de prueba, triggers/procedimientos y DCL
docker/         Imagen web (Apache + PHP + React compilado)
scripts/        Administración del servidor: instalación, usuarios, respaldos, monitoreo, seguridad, consultas
src/            Frontend React
tests/          Pruebas funcionales de la API
docs/           Documentación
```

## Documentación

- [Manual técnico](docs/manual_tecnico.md): arquitectura, base de datos, API, Docker y decisiones técnicas.
- [Manual de usuario](docs/manual_usuario.md): uso por rol.
- [Seguridad](docs/ciberseguridad.md): amenazas, controles, cifrado, SSL, red e informe OWASP.
- [Sistemas operativos](docs/sistemas_operativos.md): estudio de SO, usuarios, scripts, respaldos y monitoreo.
- [Guía para la defensa](docs/guia_defensa.md).

## Integrantes

3° MO Nocturno — ByteCraft

- Pablo Ávila
- Claudio Fernández
- Micaela Chans
- Federico Canabarro
