FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y git unzip libicu-dev libzip-dev default-mysql-client \
    && docker-php-ext-install pdo_mysql intl zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY docker/start.sh /usr/local/bin/start-backend

RUN chmod +x /usr/local/bin/start-backend

EXPOSE 8000

CMD ["start-backend"]
