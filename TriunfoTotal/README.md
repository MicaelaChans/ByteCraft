# TriunfoTotal — Sistema de Gestión Deportiva Modular (SGDM)

Plataforma web para la organización, administración y seguimiento de torneos deportivos, mentales y electrónicos (ligas, eliminación directa, sistema suizo).

Proyecto de Bachillerato Tecnológico — Tecnologías de la Información | 3° año.
Instituto Tecnológico Superior "Arias - Balparda" — 2026.

## Estado actual

⚠️ **Primera entrega — solo maquetado de frontend.**
Backend (PHP) y base de datos (MySQL) todavía no están implementados. Las acciones de login, registro y edición de perfil están simuladas con Redux para poder maquetar los flujos de la aplicación.

## Stack tecnológico

- **Frontend:** React + Vite, React Router, Redux Toolkit, React Bootstrap
- **Backend (a implementar):** PHP
- **Base de datos (a implementar):** MySQL
- **Contenedores (a implementar):** Docker

## Estructura del proyecto

```
src/
├── components/       # Páginas y componentes principales
│   └── partials/     # Navbar, Footer, Sidebar, Carousel
├── redux/            # Estado global (usuario, sesión)
├── utils/            # Funciones auxiliares (ej. enmascarado de datos sensibles)
└── css/              # Estilos globales
public/img/            # Recursos gráficos
```

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

## Integrantes del equipo

3° MO Nocturno
-Pablo Avila
-Claudio Fernández
-Micaela Chans
-Federico Canabarro 

## Próximos pasos

- [ ] Backend en PHP (autenticación, torneos, resultados)
- [ ] Modelo de base de datos MySQL (ver DER del proyecto)
- [ ] Conexión real de Tournaments, Login, Register y Profile al backend
- [ ] Despliegue con Docker