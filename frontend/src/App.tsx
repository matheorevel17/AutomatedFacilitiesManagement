import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AppPage = 'dashboard' | 'facilities' | 'alerts' | 'maintenance'

type AuthUser = {
  email: string
  id: number
  name: string
  role: string
}

type DashboardData = {
  facilities: Array<{
    id: number
    location: string
    name: string
    open_alerts_count: number
    status: string
    tools_count: number
    type: string
  }>
  maintenance_tasks: Array<{
    assignedTo?: { id: number; name: string } | null
    facility?: { id: number; name: string } | null
    id: number
    status: string
    title: string
    tool?: { id: number; name: string } | null
    updated_at: string
  }>
  recent_alerts: Array<{
    alert_type: string
    facility?: { id: number; name: string } | null
    id: number
    message: string
    severity: string
    status: string
    tool?: { id: number; name: string } | null
    triggered_at: string
  }>
  stats: {
    active_tasks: number
    facilities: number
    open_alerts: number
    tools: number
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
const navigationItems: Array<{ id: AppPage; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'maintenance', label: 'Maintenance Tasks' },
]

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers ?? {})

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>('dashboard')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [email, setEmail] = useState('admin@stagebali.test')
  const [password, setPassword] = useState('password')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  async function loadDashboard() {
    const dashboardResponse = await apiFetch('/dashboard')

    if (!dashboardResponse.ok) {
      throw new Error(`Dashboard failed with ${dashboardResponse.status}`)
    }

    const dashboardData = (await dashboardResponse.json()) as DashboardData
    setDashboard(dashboardData)
  }

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionResponse = await apiFetch('/me')

        if (sessionResponse.status === 401) {
          setUser(null)
          setDashboard(null)
          return
        }

        if (!sessionResponse.ok) {
          throw new Error(`Session check failed with ${sessionResponse.status}`)
        }

        const sessionData = (await sessionResponse.json()) as { user: AuthUser }
        setUser(sessionData.user)
        await loadDashboard()
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          setError(fetchError.message)
        }
      } finally {
        setIsCheckingSession(false)
      }
    }

    loadSession()
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      const data = (await response.json()) as
        | { message?: string; user?: AuthUser }
        | { errors?: Record<string, string | string[]> }

      if (!response.ok || !('user' in data) || !data.user) {
        if ('errors' in data && data.errors?.email) {
          const emailError = Array.isArray(data.errors.email)
            ? data.errors.email[0]
            : data.errors.email
          throw new Error(emailError)
        }

        throw new Error('Login failed.')
      }

      setUser(data.user)
      setActivePage('dashboard')
      await loadDashboard()
    } catch (loginError) {
      if (loginError instanceof Error) {
        setError(loginError.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setError(null)

    try {
      await apiFetch('/logout', { method: 'POST' })
      setUser(null)
      setDashboard(null)
      setActivePage('dashboard')
    } catch (logoutError) {
      if (logoutError instanceof Error) {
        setError(logoutError.message)
      }
    }
  }

  if (isCheckingSession) {
    return (
      <main className="app-shell">
        <section className="auth-panel">
          <p className="eyebrow">StageBali</p>
          <h1>Checking session...</h1>
          <p className="lede">The app is verifying whether a valid login cookie already exists.</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="auth-panel">
          <p className="eyebrow">StageBali access</p>
          <h1>Log in to the monitoring platform.</h1>
          <p className="lede">
            This first page uses a Laravel session cookie stored by the browser after a successful login.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="dev-hint">
            Dev account: <code>admin@stagebali.test</code> / <code>password</code>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="topbar-panel">
        <div className="topbar-title">
          <p className="eyebrow">StageBali platform</p>
          <strong>{user.name}</strong>
        </div>

        <nav className="page-nav" aria-label="Primary">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activePage ? 'nav-link active' : 'nav-link'}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </section>

      {activePage === 'dashboard' ? (
        <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Operations command</p>
            <h1>Welcome back, {user.name}.</h1>
          </div>
          <button className="logout-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <p className="lede">
          This is the first authenticated page of the app: a monitoring overview for facilities, alerts, and maintenance work.
        </p>

        <div className="stack-grid">
          <article>
            <span>Facilities</span>
            <strong>{dashboard?.stats.facilities ?? 0}</strong>
          </article>
          <article>
            <span>Automated tools</span>
            <strong>{dashboard?.stats.tools ?? 0}</strong>
          </article>
          <article>
            <span>Open alerts</span>
            <strong>{dashboard?.stats.open_alerts ?? 0}</strong>
          </article>
          <article>
            <span>Active tasks</span>
            <strong>{dashboard?.stats.active_tasks ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Facility overview</p>
            <h2>Managed facilities</h2>
          </div>
          <span className="meta-chip">{user.role}</span>
        </div>

        <div className="facility-grid">
          {dashboard?.facilities.map((facility) => (
            <article className="facility-card" key={facility.id}>
              <div className="facility-topline">
                <span className="pill ok">{facility.status}</span>
                <span className="facility-type">{facility.type}</span>
              </div>
              <h3>{facility.name}</h3>
              <p>{facility.location}</p>
              <div className="facility-metrics">
                <strong>{facility.tools_count} tools</strong>
                <strong>{facility.open_alerts_count} open alerts</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="status-panel">
        <article className="list-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Incident feed</p>
              <h2>Recent alerts</h2>
            </div>
          </div>

          <div className="list-stack">
            {dashboard?.recent_alerts.length ? (
              dashboard.recent_alerts.map((alert) => (
                <article className="list-card" key={alert.id}>
                  <div className="list-row">
                    <span className={`pill ${alert.severity === 'high' ? 'error' : 'pending'}`}>
                      {alert.severity}
                    </span>
                    <span className="list-meta">{alert.alert_type}</span>
                  </div>
                  <h3>{alert.tool?.name ?? 'Unknown tool'}</h3>
                  <p>{alert.message}</p>
                  <span className="list-meta">
                    {alert.facility?.name ?? 'Unknown facility'} • {new Date(alert.triggered_at).toLocaleString()}
                  </span>
                </article>
              ))
            ) : (
              <p className="empty-state">No alerts recorded yet.</p>
            )}
          </div>
        </article>

        <article className="list-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Maintenance flow</p>
              <h2>Active tasks</h2>
            </div>
          </div>

          <div className="list-stack">
            {dashboard?.maintenance_tasks.length ? (
              dashboard.maintenance_tasks.map((task) => (
                <article className="list-card" key={task.id}>
                  <div className="list-row">
                    <span className={`pill ${task.status === 'in_progress' ? 'pending' : 'ok'}`}>
                      {task.status}
                    </span>
                    <span className="list-meta">{task.facility?.name ?? 'Unknown facility'}</span>
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.tool?.name ?? 'No linked tool'}</p>
                  <span className="list-meta">
                    Assigned to {task.assignedTo?.name ?? 'unassigned'} • updated{' '}
                    {new Date(task.updated_at).toLocaleString()}
                  </span>
                </article>
              ))
            ) : (
              <p className="empty-state">No maintenance tasks yet.</p>
            )}
          </div>
        </article>
      </section>
        </>
      ) : null}

      {activePage === 'facilities' ? (
        <section className="page-placeholder">
          <div className="section-head">
            <div>
              <p className="eyebrow">Facilities module</p>
              <h2>Facilities</h2>
            </div>
          </div>
          <p className="lede">
            This page will contain the facility list, facility details, and the automated tools linked to each
            facility.
          </p>
        </section>
      ) : null}

      {activePage === 'alerts' ? (
        <section className="page-placeholder">
          <div className="section-head">
            <div>
              <p className="eyebrow">Alerts module</p>
              <h2>Alerts</h2>
            </div>
          </div>
          <p className="lede">
            This page will show warning notifications, detected defects, severity, and their current resolution
            status.
          </p>
        </section>
      ) : null}

      {activePage === 'maintenance' ? (
        <section className="page-placeholder">
          <div className="section-head">
            <div>
              <p className="eyebrow">Maintenance module</p>
              <h2>Maintenance Tasks</h2>
            </div>
          </div>
          <p className="lede">
            This page will contain task tracking, assignments, progress, and updates created after alerts.
          </p>
        </section>
      ) : null}
    </main>
  )
}

export default App
