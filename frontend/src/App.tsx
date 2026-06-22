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

type FacilitiesData = {
  facilities: Array<{
    active_tasks_count: number
    alerts: Array<{
      id: number
      alert_type: string
      severity: string
      status: string
      message: string
      triggered_at: string
    }>
    automated_tools: Array<{
      id: number
      installation_date: string | null
      latest_sensor_reading?: {
        recorded_at: string
        status: string
        unit: string
        value: string
      } | null
      location: string
      name: string
      normal_max: string
      normal_min: string
      open_alerts_count: number
      status: string
      type: string
      unit: string
    }>
    description: string | null
    id: number
    location: string
    maintenance_tasks: Array<{
      assigned_to?: { id: number; name: string } | null
      id: number
      status: string
      title: string
      updated_at: string
    }>
    name: string
    open_alerts_count: number
    status: string
    tools_count: number
    type: string
  }>
}

type AlertsData = {
  alerts: Array<{
    alert_type: string
    facility?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    id: number
    message: string
    severity: string
    status: string
    tool?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    triggered_at: string
  }>
  stats: {
    facilities_affected: number
    high_severity: number
    open: number
    total: number
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
  const [facilitiesData, setFacilitiesData] = useState<FacilitiesData | null>(null)
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null)
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
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

  async function loadFacilities() {
    const facilitiesResponse = await apiFetch('/facilities')

    if (!facilitiesResponse.ok) {
      throw new Error(`Facilities failed with ${facilitiesResponse.status}`)
    }

    const facilitiesPayload = (await facilitiesResponse.json()) as FacilitiesData
    setFacilitiesData(facilitiesPayload)
    setSelectedFacilityId((current) => current ?? facilitiesPayload.facilities[0]?.id ?? null)
  }

  async function loadAlerts() {
    const alertsResponse = await apiFetch('/alerts')

    if (!alertsResponse.ok) {
      throw new Error(`Alerts failed with ${alertsResponse.status}`)
    }

    const alertsPayload = (await alertsResponse.json()) as AlertsData
    setAlertsData(alertsPayload)
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
        await loadFacilities()
        await loadAlerts()
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
      await loadFacilities()
      await loadAlerts()
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
      setFacilitiesData(null)
      setAlertsData(null)
      setSelectedFacilityId(null)
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

  const selectedFacility =
    facilitiesData?.facilities.find((facility) => facility.id === selectedFacilityId) ?? facilitiesData?.facilities[0] ?? null

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
        <>
          <section className="hero-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Facilities module</p>
                <h1>Facilities overview.</h1>
              </div>
              <button className="logout-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
            <p className="lede">
              Browse each facility, inspect its automated tools, and review the most recent alerts and maintenance
              activity linked to it.
            </p>
          </section>

          <section className="facilities-layout">
            <article className="facilities-sidebar">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Facility list</p>
                  <h2>All facilities</h2>
                </div>
              </div>

              <div className="facility-selector-list">
                {facilitiesData?.facilities.map((facility) => (
                  <button
                    key={facility.id}
                    type="button"
                    className={
                      facility.id === selectedFacility?.id
                        ? 'facility-selector-card active'
                        : 'facility-selector-card'
                    }
                    onClick={() => setSelectedFacilityId(facility.id)}
                  >
                    <div className="facility-topline">
                      <span className="pill ok">{facility.status}</span>
                      <span className="facility-type">{facility.type}</span>
                    </div>
                    <strong>{facility.name}</strong>
                    <span className="list-meta">{facility.location}</span>
                    <span className="list-meta">
                      {facility.tools_count} tools • {facility.open_alerts_count} open alerts
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="facilities-main">
              {selectedFacility ? (
                <>
                  <section className="section-panel">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">Facility detail</p>
                        <h2>{selectedFacility.name}</h2>
                      </div>
                      <span className="meta-chip">{selectedFacility.type}</span>
                    </div>

                    <p className="lede">{selectedFacility.description ?? 'No description provided for this facility yet.'}</p>

                    <div className="stack-grid compact-grid">
                      <article>
                        <span>Status</span>
                        <strong>{selectedFacility.status}</strong>
                      </article>
                      <article>
                        <span>Location</span>
                        <strong>{selectedFacility.location}</strong>
                      </article>
                      <article>
                        <span>Automated tools</span>
                        <strong>{selectedFacility.tools_count}</strong>
                      </article>
                      <article>
                        <span>Active maintenance tasks</span>
                        <strong>{selectedFacility.active_tasks_count}</strong>
                      </article>
                    </div>
                  </section>

                  <section className="section-panel">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">Automated tools</p>
                        <h2>Installed tools</h2>
                      </div>
                    </div>

                    <div className="facility-grid">
                      {selectedFacility.automated_tools.map((tool) => (
                        <article className="facility-card" key={tool.id}>
                          <div className="facility-topline">
                            <span className="pill ok">{tool.status}</span>
                            <span className="facility-type">{tool.type}</span>
                          </div>
                          <h3>{tool.name}</h3>
                          <p>{tool.location}</p>
                          <div className="tool-reading">
                            <strong>
                              {tool.latest_sensor_reading
                                ? `${tool.latest_sensor_reading.value} ${tool.latest_sensor_reading.unit}`
                                : 'No reading yet'}
                            </strong>
                            <span className="list-meta">
                              Normal range: {tool.normal_min} to {tool.normal_max} {tool.unit}
                            </span>
                            <span className="list-meta">{tool.open_alerts_count} open alerts</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="status-panel">
                    <article className="list-panel">
                      <div className="section-head">
                        <div>
                          <p className="eyebrow">Recent alerts</p>
                          <h2>Facility alerts</h2>
                        </div>
                      </div>

                      <div className="list-stack">
                        {selectedFacility.alerts.length ? (
                          selectedFacility.alerts.map((alert) => (
                            <article className="list-card" key={alert.id}>
                              <div className="list-row">
                                <span className={`pill ${alert.severity === 'high' ? 'error' : 'pending'}`}>
                                  {alert.severity}
                                </span>
                                <span className="list-meta">{alert.alert_type}</span>
                              </div>
                              <p>{alert.message}</p>
                              <span className="list-meta">
                                {new Date(alert.triggered_at).toLocaleString()} • {alert.status}
                              </span>
                            </article>
                          ))
                        ) : (
                          <p className="empty-state">No alerts for this facility yet.</p>
                        )}
                      </div>
                    </article>

                    <article className="list-panel">
                      <div className="section-head">
                        <div>
                          <p className="eyebrow">Maintenance tasks</p>
                          <h2>Facility tasks</h2>
                        </div>
                      </div>

                      <div className="list-stack">
                        {selectedFacility.maintenance_tasks.length ? (
                          selectedFacility.maintenance_tasks.map((task) => (
                            <article className="list-card" key={task.id}>
                              <div className="list-row">
                                <span className={`pill ${task.status === 'in_progress' ? 'pending' : 'ok'}`}>
                                  {task.status}
                                </span>
                              </div>
                              <h3>{task.title}</h3>
                              <span className="list-meta">
                                Assigned to {task.assigned_to?.name ?? 'unassigned'} •{' '}
                                {new Date(task.updated_at).toLocaleString()}
                              </span>
                            </article>
                          ))
                        ) : (
                          <p className="empty-state">No maintenance tasks for this facility yet.</p>
                        )}
                      </div>
                    </article>
                  </section>
                </>
              ) : (
                <section className="page-placeholder">
                  <p className="empty-state">No facility available yet.</p>
                </section>
              )}
            </article>
          </section>
        </>
      ) : null}

      {activePage === 'alerts' ? (
        <>
          <section className="hero-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Alerts module</p>
                <h1>Alerts overview.</h1>
              </div>
              <button className="logout-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
            <p className="lede">
              Centralized list of anomalies detected across the Air Conditioning System and the Water System.
            </p>

            <div className="stack-grid">
              <article>
                <span>Total alerts</span>
                <strong>{alertsData?.stats.total ?? 0}</strong>
              </article>
              <article>
                <span>Open alerts</span>
                <strong>{alertsData?.stats.open ?? 0}</strong>
              </article>
              <article>
                <span>High severity</span>
                <strong>{alertsData?.stats.high_severity ?? 0}</strong>
              </article>
              <article>
                <span>Facilities affected</span>
                <strong>{alertsData?.stats.facilities_affected ?? 0}</strong>
              </article>
            </div>
          </section>

          <section className="section-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Detected issues</p>
                <h2>All current alerts</h2>
              </div>
            </div>

            <div className="alerts-grid">
              {alertsData?.alerts.length ? (
                alertsData.alerts.map((alert) => (
                  <article className="list-card" key={alert.id}>
                    <div className="list-row">
                      <span className={`pill ${alert.severity === 'high' ? 'error' : 'pending'}`}>
                        {alert.severity}
                      </span>
                      <span className="list-meta">{alert.status}</span>
                    </div>

                    <h3>{alert.alert_type}</h3>
                    <p>{alert.message}</p>

                    <div className="alert-context">
                      <span className="list-meta">
                        Facility: {alert.facility?.name ?? 'Unknown'} ({alert.facility?.location ?? 'N/A'})
                      </span>
                      <span className="list-meta">
                        Tool: {alert.tool?.name ?? 'Unknown'} • {alert.tool?.type ?? 'N/A'}
                      </span>
                      <span className="list-meta">
                        Triggered: {new Date(alert.triggered_at).toLocaleString()}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-state">No alerts recorded yet.</p>
              )}
            </div>
          </section>
        </>
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
