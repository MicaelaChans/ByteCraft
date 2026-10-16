<?php
// api/index.php — FRONT CONTROLLER
//
// Es el ÚNICO archivo PHP accesible desde la web. Todas las peticiones a
// /api/... llegan acá (por .htaccess / configuración de Apache) y el Router
// decide qué controlador las atiende. El resto del código (app/, config/)
// queda FUERA de la carpeta pública del servidor.

require_once __DIR__ . '/../app/core/App.php';

App::ejecutar();
