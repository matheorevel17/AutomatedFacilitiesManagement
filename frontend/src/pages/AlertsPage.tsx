import type { AlertsData } from '../types/app'

type AlertsPageProps = {
  alertsData: AlertsData | null
  onLogout: () => void
}

export function AlertsPage({ alertsData, onLogout }: AlertsPageProps) {
  return (
    <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Alerts module</p>
            <h1>Alerts overview.</h1>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
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
  )
}
