import type { AuthUser, DashboardData } from '../types/app'

type DashboardPageProps = {
  dashboard: DashboardData | null
  user: AuthUser
}

export function DashboardPage({ dashboard, user }: DashboardPageProps) {
  return (
    <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Operations command</p>
            <h1>Welcome back, {user.name}.</h1>
          </div>
        </div>
        <p className="lede">
          This is the first authenticated page of the app: a monitoring overview for facilities, alerts, and
          maintenance work.
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
                    {alert.facility?.name ?? 'Unknown facility'} •{' '}
                    {new Date(alert.triggered_at).toLocaleString()}
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
  )
}
