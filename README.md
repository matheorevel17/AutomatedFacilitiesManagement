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
