import { useEffect, useState } from 'react'
import './App.css'

type BackendStatus = {
  message?: string
  name?: string
  status?: string
}

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadStatus() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
        const response = await fetch(`${apiUrl}/health`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Backend answered with ${response.status}`)
        }

        const data = (await response.json()) as BackendStatus
        setBackendStatus(data)
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name !== 'AbortError') {
          setError(fetchError.message)
        }
      }
    }

    loadStatus()

    return () => controller.abort()
  }, [])

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">StageBali starter stack</p>
        <h1>Laravel, React TS, MySQL, Docker.</h1>
        <p className="lede">
          Base de dev minimale pour lancer le backend et le frontend proprement
          des le premier jour.
        </p>

        <div className="stack-grid">
          <article>
            <span>Backend</span>
            <strong>Laravel 13</strong>
          </article>
          <article>
            <span>Frontend</span>
            <strong>React + TypeScript</strong>
          </article>
          <article>
            <span>Database</span>
            <strong>MySQL 8</strong>
          </article>
          <article>
            <span>Runtime</span>
            <strong>Docker Compose</strong>
          </article>
        </div>
      </section>

      <section className="status-panel">
        <div className="status-copy">
          <p className="eyebrow">Connexion backend</p>
          <h2>Healthcheck API</h2>
          <p>
            Le frontend tente un appel sur <code>/api/health</code> au
            chargement.
          </p>
        </div>

        <div className="status-card">
          {backendStatus ? (
            <>
              <span className="pill ok">Backend reachable</span>
              <strong>{backendStatus.name ?? 'Laravel'}</strong>
              <p>{backendStatus.message ?? 'Backend is running.'}</p>
            </>
          ) : error ? (
            <>
              <span className="pill error">Connexion indisponible</span>
              <strong>Backend non joignable</strong>
              <p>{error}</p>
            </>
          ) : (
            <>
              <span className="pill pending">Verification</span>
              <strong>Test de connexion en cours</strong>
              <p>Le frontend attend la reponse du backend.</p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
