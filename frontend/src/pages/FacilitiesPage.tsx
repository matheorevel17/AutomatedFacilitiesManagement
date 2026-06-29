import type { FacilitiesData } from '../types/app'

type FacilitiesPageProps = {
  facilitiesData: FacilitiesData | null
  selectedFacilityId: number | null
  onLogout: () => void
  onSelectedFacilityChange: (facilityId: number) => void
}

export function FacilitiesPage({
  facilitiesData,
  selectedFacilityId,
  onLogout,
  onSelectedFacilityChange,
}: FacilitiesPageProps) {
  const selectedFacility =
    facilitiesData?.facilities.find((facility) => facility.id === selectedFacilityId) ??
    facilitiesData?.facilities[0] ??
    null

  return (
    <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Facilities module</p>
            <h1>Facilities overview.</h1>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
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
                  facility.id === selectedFacility?.id ? 'facility-selector-card active' : 'facility-selector-card'
                }
                onClick={() => onSelectedFacilityChange(facility.id)}
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

                <p className="lede">
                  {selectedFacility.description ?? 'No description provided for this facility yet.'}
                </p>

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
  )
}
