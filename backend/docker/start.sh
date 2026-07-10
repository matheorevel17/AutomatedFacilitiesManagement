#!/bin/sh
set -e

PORT="${PORT:-8000}"
APP_ENV="${APP_ENV:-local}"

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

if [ ! -d vendor ]; then
  if [ "$APP_ENV" = "production" ]; then
    composer install --no-dev --no-interaction --prefer-dist --no-progress --optimize-autoloader
  else
    composer install --no-interaction --prefer-dist --no-progress
  fi
fi

if [ -z "$APP_KEY" ] && [ "$APP_ENV" != "production" ]; then
  php artisan key:generate --ansi
fi

if [ "$APP_ENV" = "production" ]; then
  php artisan config:cache
fi

if [ "$RUN_MIGRATIONS" = "true" ]; then
  until php artisan migrate --force; do
    echo "Waiting for database..."
    sleep 3
  done
fi

php artisan serve --host=0.0.0.0 --port="$PORT"
