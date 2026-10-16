# =====================================================================
#  Imagen WEB de TriunfoTotal: Apache + PHP 8.1 + frontend React compilado
#  Se construye en 2 etapas ("multi-stage build"):
#    1) node   -> compila React (npm run build) y genera /build/dist
#    2) php    -> Apache con PHP; copia solo el resultado (la imagen final
#                 NO tiene node_modules ni el código fuente del frontend)
# =====================================================================

# ---------- Etapa 1: compilar el frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- Etapa 2: servidor Apache + PHP ----------
FROM php:8.1-apache

# Extensión para MySQL/MariaDB, módulos de Apache y openssl (certificado)
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite ssl headers \
 && apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 # No revelar versión de Apache/SO en cabeceras ni páginas de error
 && sed -ri 's/^ServerTokens .*/ServerTokens Prod/; s/^ServerSignature .*/ServerSignature Off/' /etc/apache2/conf-available/security.conf

COPY docker/web/php.ini             /usr/local/etc/php/conf.d/zz-triunfo.ini
COPY docker/web/apache-triunfo.conf /etc/apache2/sites-available/000-default.conf
COPY docker/web/entrypoint.sh       /usr/local/bin/triunfo-entrypoint

# Estructura dentro del contenedor:
#   /var/www/triunfo/public  -> lo ÚNICO visible desde la web (React compilado)
#   /var/www/triunfo/api     -> front controller (index.php), publicado como /api
#   /var/www/triunfo/app     -> controladores, modelos, módulos (NO accesible desde la web)
#   /var/www/triunfo/config  -> conexión a la BD (NO accesible desde la web)
WORKDIR /var/www/triunfo
COPY app            ./app
COPY api/index.php  ./api/index.php
COPY config/Conexion.php ./config/Conexion.php
COPY --from=frontend /build/dist ./public

# El código es de root y solo lectura para Apache (www-data): si alguien
# lograra ejecutar algo como www-data, no podría modificar la aplicación.
RUN chown -R root:root /var/www/triunfo \
 && find /var/www/triunfo -type d -exec chmod 755 {} \; \
 && find /var/www/triunfo -type f -exec chmod 644 {} \; \
 && chmod 755 /usr/local/bin/triunfo-entrypoint \
 && mkdir -p /etc/apache2/ssl

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsk https://localhost/api/disciplinas > /dev/null || exit 1

ENTRYPOINT ["triunfo-entrypoint"]
CMD ["apache2-foreground"]
