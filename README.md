# StageBali Starter

Stack de base:

- `backend/`: Laravel
- `frontend/`: React + TypeScript avec Vite
- `mysql`: base de donnees Docker

Lancement en local avec Docker:

```bash
docker compose up --build
```

Points d'acces:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API healthcheck: `http://localhost:8000/api/health`

## CI

Le projet contient une pipeline GitHub Actions dans `.github/workflows/ci.yml`.

Elle verifie automatiquement:

- backend Laravel: installation Composer, migrations SQLite, tests Laravel
- frontend React: installation npm, lint, build TypeScript/Vite

## Deploiement Railway

Le repo est prepare pour un deploiement Railway avec deux services et une base MySQL:

- service backend: root directory `backend`
- service frontend: root directory `frontend`
- service database: MySQL Railway

Railway genere automatiquement les URLs HTTPS depuis `Settings > Networking > Generate Domain`.

Variables backend a configurer dans Railway:

```env
APP_NAME=StageBali
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:CHANGE_ME
APP_URL=https://YOUR_BACKEND_DOMAIN.up.railway.app
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN.up.railway.app

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
```

Variables frontend a configurer dans Railway:

```env
VITE_API_URL=https://YOUR_BACKEND_DOMAIN.up.railway.app/api
```

Pour generer `APP_KEY`:

```bash
cd backend
php artisan key:generate --show
```

Commandes utiles apres le premier deploiement backend:

```bash
php artisan db:seed --force
```

Compte de test cree par le seeder:

```txt
admin@stagebali.test / password
```
