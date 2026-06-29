import type { MaintenanceTasksData } from '../types/app'

type MaintenanceTasksPageProps = {
  maintenanceTasksData: MaintenanceTasksData | null
  onLogout: () => void
}

export function MaintenanceTasksPage({ maintenanceTasksData, onLogout }: MaintenanceTasksPageProps) {
  return (
    <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Maintenance module</p>
            <h1>Maintenance tasks overview.</h1>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
        <p className="lede">
          Track the interventions created after alerts, see assignments, and follow the operational status of each
          maintenance task.
        </p>

        <div className="stack-grid">
          <article>
            <span>Total tasks</span>
            <strong>{maintenanceTasksData?.stats.total ?? 0}</strong>
          </article>
          <article>
            <span>Pending</span>
            <strong>{maintenanceTasksData?.stats.pending ?? 0}</strong>
          </article>
          <article>
            <span>In progress</span>
            <strong>{maintenanceTasksData?.stats.in_progress ?? 0}</strong>
          </article>
          <article>
            <span>Resolved</span>
            <strong>{maintenanceTasksData?.stats.resolved ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Task tracking</p>
            <h2>All maintenance tasks</h2>
          </div>
        </div>

        <div className="maintenance-grid">
          {maintenanceTasksData?.tasks.length ? (
            maintenanceTasksData.tasks.map((task) => (
              <article className="list-card" key={task.id}>
                <div className="list-row">
                  <span
                    className={`pill ${
                      task.status === 'in_progress' ? 'pending' : task.status === 'resolved' ? 'ok' : 'error'
                    }`}
                  >
                    {task.status}
                  </span>
                  <span className="list-meta">{task.facility?.name ?? 'Unknown facility'}</span>
                </div>

                <h3>{task.title}</h3>
                <p>{task.description ?? 'No detailed description yet.'}</p>

                <div className="alert-context">
                  <span className="list-meta">
                    Tool: {task.tool?.name ?? 'Unknown'} • {task.tool?.type ?? 'N/A'}
                  </span>
                  <span className="list-meta">Assigned to: {task.assignedTo?.name ?? 'unassigned'}</span>
                  <span className="list-meta">
                    Related alert: {task.alert?.alert_type ?? 'None'} ({task.alert?.severity ?? 'N/A'})
                  </span>
                  <span className="list-meta">Updated: {new Date(task.updated_at).toLocaleString()}</span>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-state">No maintenance tasks recorded yet.</p>
          )}
        </div>
      </section>
    </>
  )
}
