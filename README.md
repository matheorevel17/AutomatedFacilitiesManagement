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
CLOUD_INGESTION_TOKEN=CHANGE_ME
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

## Cloud sensor ingestion

Le backend expose une API pour recevoir des valeurs de capteurs depuis un simulateur externe ou un futur service cloud.

Endpoint:

```txt
POST /api/cloud/sensor-readings
```

Header si `CLOUD_INGESTION_TOKEN` est configure:

```txt
X-Cloud-Token: CHANGE_ME
```

Exemple pour une seule valeur:

```bash
curl -X POST https://YOUR_BACKEND_DOMAIN.up.railway.app/api/cloud/sensor-readings \
  -H "Content-Type: application/json" \
  -H "X-Cloud-Token: CHANGE_ME" \
  -d '{"tool_id":1,"recorded_at":"2026-07-16T10:00:00Z","value":3.2,"unit":"bar"}'
```

Exemple pour un lot de valeurs:

```json
{
  "readings": [
    {
      "tool_id": 1,
      "recorded_at": "2026-07-16T10:00:00Z",
      "value": 3.2,
      "unit": "bar"
    },
    {
      "tool_id": 1,
      "recorded_at": "2026-07-16T10:05:00Z",
      "value": 1.8,
      "unit": "bar"
    }
  ]
}
```

Le backend compare chaque valeur avec la plage normale du tool (`normal_min`, `normal_max`) et stocke le status `normal`, `warning` ou `critical`.

Interface externe du simulateur:

```bash
cd simulator
npm run ui
```

Puis ouvrir `http://localhost:5174`. L'application principale affiche les valeurs recues dans la page `Data`.
