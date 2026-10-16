# Manual de usuario — TriunfoTotal

*"Todos los juegos, una sola pasión."*

TriunfoTotal permite organizar y seguir torneos de cualquier disciplina (fútbol, ajedrez, e-sports, vóley…) en formato **liga**, **eliminación directa** o **sistema suizo**.

---

## 1. Sin cuenta (público)

Cualquier persona puede **consultar** sin registrarse:

- **Inicio:** torneos en curso y torneos con inscripciones abiertas.
- **Torneos:** buscador por nombre, disciplina u organizador, con filtros por disciplina, formato y estado.
- **Detalle de un torneo:**
  - **Liga / suizo:** tabla de posiciones y fixture con resultados por jornada o ronda.
  - **Eliminación:** la **llave** con cada ronda; el ganador de cada cruce aparece resaltado.
  - Datos del torneo, participantes y, al terminar, el **campeón**.

## 2. Crear cuenta e iniciar sesión

1. Hacé clic en el ícono de usuario (arriba a la derecha) y elegí **Registrate**.
2. Completá nombre, apellido, email y contraseña. La contraseña debe tener mínimo 8 caracteres, con mayúscula, minúscula y número.
3. Al registrarte ya quedás con la sesión iniciada.
4. Para volver a entrar usá **Iniciar sesión**. Después de 5 intentos fallidos la cuenta se bloquea 15 minutos, por seguridad.

## 3. Mi perfil

En el menú de usuario → **Mi perfil**:

- Con el **lápiz** editás nombre, apellido, alias, teléfono, dirección y foto.
- En **Torneos que organizo** ves tus torneos, con el botón **Gestionar**.
- En **Historial de torneos** ves en los que participás y con qué equipo.
- En **Seguridad** cambiás tu contraseña.
- La campanita 🔔 muestra tus **notificaciones**: inscripciones aceptadas, torneos aprobados, partidos programados, etc.

## 4. Equipos (registrar participantes)

Menú → **Mis equipos**:

1. Escribí el nombre del equipo y tocá **Crear equipo**. Quedás como **capitán** ⭐.
2. Agregá integrantes con su **email o alias** (tienen que estar registrados).
3. Como capitán podés renombrar, quitar miembros o eliminar el equipo (solo si todavía no jugó partidos).
4. Si no sos capitán, podés **salir** del equipo.

> En torneos **individuales** (ajedrez, 1 vs 1) no hace falta equipo: te inscribís directamente.

## 5. Inscribirse en un torneo

1. Entrá al torneo; debe decir **"Inscripciones abiertas"**.
2. Si es por equipos, elegí uno de los equipos donde sos capitán.
3. Tocá **Inscribirme**. La solicitud queda **Pendiente** hasta que el organizador la acepta, y te llega una notificación.
4. Mientras el torneo no empiece, el capitán puede **retirarse**.

## 6. Organizar un torneo

### 6.1 Crear el torneo y elegir su tipo

Menú de usuario → **Crear Torneo** (o "Crear torneo" en la página de Torneos):

| Campo | Qué significa |
|---|---|
| Disciplina | Fútbol, Ajedrez, eSports, etc. |
| **Formato** | **Liga**: todos contra todos y gana el que suma más puntos. **Eliminación directa**: el que pierde queda afuera. **Suizo**: varias rondas emparejando a quienes tienen puntajes parecidos, sin eliminar a nadie. |
| Modalidad | Por equipos o individual. |
| **Tipo** | **Informal**: se publica al instante. **Formal**: lo revisa un administrador antes de publicarse. |
| Máximo de participantes | Entre 2 y 128. |
| Ida y vuelta (liga) | Cada par de equipos juega dos veces. |
| Rondas (suizo) | Si se deja vacío, se calcula automáticamente. |
| Puntos | Cuánto vale ganar, empatar y perder (por defecto 3/1/0). |

### 6.2 Registrar participantes

En **Gestionar torneo**, antes de empezar:

- **Aceptar o rechazar** solicitudes de inscripción.
- **Inscribir directamente** a un equipo o participante, buscándolo por nombre.
- **Editar** o **eliminar** el torneo.

### 6.3 Generar los enfrentamientos

Tocá **Iniciar y generar enfrentamientos**. Hacen falta al menos 2 participantes aceptados (3 en el suizo). El sistema arma solo:

- **Liga:** el fixture completo, con todas las jornadas.
- **Eliminación:** la llave sorteada. Si los participantes no son 2, 4, 8, 16…, algunos pasan directo a la segunda ronda (BYE).
- **Suizo:** la ronda 1 por sorteo.

Las solicitudes que estaban pendientes se rechazan automáticamente.

### 6.4 Cargar resultados

En cada ronda abierta:

1. Escribí los goles o puntos de cada participante y, si querés, la fecha y hora del partido.
2. Tocá **Guardar**. La tabla de posiciones se actualiza sola.
3. En **eliminación directa** no se permiten empates: cargá el resultado con la definición (por ejemplo, penales).
4. Podés corregir un resultado mientras la ronda está abierta. Una vez **cerrada**, solo un administrador puede corregirlo.

### 6.5 Cerrar rondas y publicar

Cuando todos los partidos de la ronda tienen resultado, tocá **Cerrar ronda**:

- **Liga:** cuando cerrás la última jornada, el torneo termina.
- **Eliminación:** se genera sola la ronda siguiente con los ganadores (cuartos → semifinal → final).
- **Suizo:** se genera la ronda siguiente emparejando por puntos.

Al terminar, el torneo pasa a **Finalizado**, se muestra el 🏆 **campeón** y todos los participantes reciben una notificación.

**Toda la información es pública al instante:** fixture, resultados, posiciones y llave se ven en la página del torneo sin necesidad de iniciar sesión.

### 6.6 Consultar posiciones

En la página del torneo, la tabla muestra PJ (jugados), G (ganados), E (empatados), P (perdidos), GF y GC (a favor y en contra), DIF (diferencia) y Pts. El orden es por puntos, después diferencia y después tantos a favor. Tu equipo aparece resaltado.

## 7. Administrador

Menú → **Admin** (solo para usuarios con rol Administrador):

| Pestaña | Para qué |
|---|---|
| **Resumen** | Números del sistema (usuarios, torneos, partidos, logins fallidos) y gráficos por disciplina y formato. |
| **Torneos a aprobar** | Torneos **formales** pendientes. **Aprobar** los publica; **Rechazar** exige escribir un motivo, que le llega al organizador. |
| **Usuarios** | Buscar usuarios, **banear o reactivar** (un baneado no puede entrar y se le corta la sesión) y **dar o quitar** el rol administrador. |
| **Módulos** | Habilitar o deshabilitar formatos de competencia (Liga, Eliminación, Suizo). |
| **Auditoría** | Historial de **todos** los cambios y accesos, con filtros por tabla, acción, usuario y fecha, y descarga en **CSV**. |

El administrador también puede gestionar cualquier torneo y corregir resultados de rondas ya cerradas.

## 8. Preguntas frecuentes

- **No veo mi torneo en el listado.** Si es formal, está esperando la aprobación de un administrador. Lo ves desde tu perfil.
- **No me deja inscribir a mi equipo.** Tenés que ser el capitán, y el torneo debe tener inscripciones abiertas y cupo disponible.
- **¿Puedo organizar y jugar a la vez?** Sí, los roles son dinámicos: podés organizar un torneo y jugar en otro (o en el mismo).
- **El navegador dice "conexión no privada".** En la versión de demostración el certificado es autofirmado; tocá "Avanzado → Continuar".
