# ==============================================================================
# Multi-Stage Production Dockerfile for ApexCare Enterprise HMS
# Stage 1: Build Frontend Assets (React + Vite + Tailwind)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Production PHP 8.4-FPM Runtime Image
# ==============================================================================
FROM php:8.4-fpm-alpine AS production

# Set working directory
WORKDIR /var/www/html

# Install system dependencies & PostgreSQL / PHP native libraries
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    oniguruma-dev \
    supervisor \
    nginx \
    curl \
    git \
    bash \
    tzdata

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        bcmath \
        gd \
        intl \
        zip \
        opcache \
        pcntl

# Install Redis extension via PECL
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Copy Composer from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy application files
COPY . /var/www/html

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /app/public/build /var/www/html/public/build

# Install PHP production dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Copy configuration files
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set file permissions for web server
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Expose HTTP port
EXPOSE 80

# Run supervisor to keep Nginx, PHP-FPM, and Queue workers alive
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
