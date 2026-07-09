#!/bin/sh
set -e

until php artisan migrate --force; do
  echo "Waiting for database..."
  sleep 3
done
