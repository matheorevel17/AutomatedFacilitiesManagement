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
