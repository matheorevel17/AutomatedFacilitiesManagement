#!/bin/sh
set -e

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

composer install

until php artisan migrate --force; do
  echo "Waiting for MySQL..."
  sleep 3
done

php artisan serve --host=0.0.0.0 --port=8000
