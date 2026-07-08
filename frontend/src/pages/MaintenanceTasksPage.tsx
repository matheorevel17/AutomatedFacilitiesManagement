import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createMaintenanceTask,
  deleteMaintenanceTask,
  updateMaintenanceTask,
  updateMaintenanceTaskStatus,
} from '../api/maintenanceTasks'
import type { MaintenanceTaskPayload, MaintenanceTasksData } from '../types/app'

type MaintenanceTasksPageProps = {
  maintenanceTasksData: MaintenanceTasksData | null
  onDataChanged: () => Promise<void>
}

type TaskFormState = {
  alert_id: string
  assigned_to_user_id: string
  description: string
  facility_id: string
  priority: string
  status: string
  title: string
  tool_id: string
}

const emptyForm: TaskFormState = {
  alert_id: '',
  assigned_to_user_id: '',
  description: '',
  facility_id: '',
  priority: 'medium',
  status: 'pending',
  title: '',
  tool_id: '',
}

function getStatusClass(status: string) {
  if (status === 'resolved') {
    return 'ok'
  }

  if (status === 'in_progress') {
    return 'pending'
  }

  return 'error'
}

function getPriorityClass(priority: string) {
  if (priority === 'critical' || priority === 'high') {
    return 'error'
  }

  if (priority === 'medium') {
    return 'pending'
  }

  return 'ok'
}

export function MaintenanceTasksPage({
  maintenanceTasksData,
  onDataChanged,
}: MaintenanceTasksPageProps) {
  const [form, setForm] = useState<TaskFormState>(emptyForm)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedFacilityId = form.facility_id || (
    maintenanceTasksData?.facilities[0] ? String(maintenanceTasksData.facilities[0].id) : ''
  )

  const toolsForFacility = maintenanceTasksData?.tools.filter(
    (tool) => String(tool.facility_id) === selectedFacilityId,
  ) ?? []

  const selectedToolId = form.tool_id || (toolsForFacility[0] ? String(toolsForFacility[0].id) : '')

  const alertsForFacility = maintenanceTasksData?.alerts.filter(
    (alert) => String(alert.facility_id) === selectedFacilityId,
  ) ?? []

  function updateField(field: keyof TaskFormState, value: string) {
    setForm((current) => {
      if (field === 'facility_id') {
        const firstTool = maintenanceTasksData?.tools.find((tool) => String(tool.facility_id) === value)

        return {
          ...current,
          alert_id: '',
          facility_id: value,
          tool_id: firstTool ? String(firstTool.id) : '',
        }
      }

      return { ...current, [field]: value }
    })
  }

  function resetForm() {
    const firstFacility = maintenanceTasksData?.facilities[0]
    const firstTool = firstFacility
      ? maintenanceTasksData?.tools.find((tool) => tool.facility_id === firstFacility.id)
      : null

    setEditingTaskId(null)
    setForm({
      ...emptyForm,
      facility_id: firstFacility ? String(firstFacility.id) : '',
      tool_id: firstTool ? String(firstTool.id) : '',
    })
    setFormError(null)
  }

  function startEdit(task: MaintenanceTasksData['tasks'][number]) {
    setEditingTaskId(task.id)
    setForm({
      alert_id: task.alert_id ? String(task.alert_id) : '',
      assigned_to_user_id: task.assigned_to_user_id ? String(task.assigned_to_user_id) : '',
      description: task.description ?? '',
      facility_id: String(task.facility_id),
      priority: task.priority,
      status: task.status,
      title: task.title,
      tool_id: String(task.tool_id),
    })
    setFormError(null)
  }

  function buildPayload(): MaintenanceTaskPayload {
    return {
      alert_id: form.alert_id ? Number(form.alert_id) : null,
      assigned_to_user_id: form.assigned_to_user_id ? Number(form.assigned_to_user_id) : null,
      description: form.description.trim() || null,
      facility_id: Number(selectedFacilityId),
      priority: form.priority,
      status: form.status,
      title: form.title.trim(),
      tool_id: Number(selectedToolId),
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      const payload = buildPayload()

      if (editingTaskId) {
        await updateMaintenanceTask(editingTaskId, payload)
      } else {
        await createMaintenanceTask(payload)
      }

      await onDataChanged()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResolve(taskId: number) {
    setFormError(null)

    try {
      await updateMaintenanceTaskStatus(taskId, 'resolved')
      await onDataChanged()
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      }
    }
  }

  async function handleDelete(taskId: number) {
    if (!window.confirm('Delete this maintenance task?')) {
      return
    }

    setFormError(null)

    try {
      await deleteMaintenanceTask(taskId)
      await onDataChanged()

      if (editingTaskId === taskId) {
        resetForm()
      }
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      }
    }
  }

  return (
    <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Maintenance module</p>
            <h1>Maintenance tasks overview.</h1>
          </div>
        </div>
        <p className="lede">
          Create interventions after alerts, assign technicians, update status, and close completed maintenance work.
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

      <section className="management-layout">
        <article className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">{editingTaskId ? 'Edit task' : 'New task'}</p>
              <h2>{editingTaskId ? 'Update maintenance task' : 'Create maintenance task'}</h2>
            </div>
            {editingTaskId ? (
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <form className="management-form" onSubmit={handleSubmit}>
            <label>
              <span>Title</span>
              <input value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
            </label>

            <label>
              <span>Facility</span>
              <select
                value={selectedFacilityId}
                onChange={(event) => updateField('facility_id', event.target.value)}
                required
              >
                {maintenanceTasksData?.facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Automated tool</span>
              <select
                value={selectedToolId}
                onChange={(event) => updateField('tool_id', event.target.value)}
                required
              >
                {toolsForFacility.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Related alert</span>
              <select value={form.alert_id} onChange={(event) => updateField('alert_id', event.target.value)}>
                <option value="">No related alert</option>
                {alertsForFacility.map((alert) => (
                  <option key={alert.id} value={alert.id}>
                    {alert.alert_type} - {alert.severity} - {alert.status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Assigned user</span>
              <select
                value={form.assigned_to_user_id}
                onChange={(event) => updateField('assigned_to_user_id', event.target.value)}
              >
                <option value="">Unassigned</option>
                {maintenanceTasksData?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label>
                <span>Status</span>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="pending">pending</option>
                  <option value="in_progress">in progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={form.priority} onChange={(event) => updateField('priority', event.target.value)}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
            </div>

            <label>
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            <button type="submit" disabled={isSaving || !selectedToolId}>
              {isSaving ? 'Saving...' : editingTaskId ? 'Update task' : 'Create task'}
            </button>
          </form>
        </article>

        <article className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Task tracking</p>
              <h2>All maintenance tasks</h2>
            </div>
          </div>

          <div className="maintenance-grid">
            {maintenanceTasksData?.tasks.length ? (
              maintenanceTasksData.tasks.map((task) => (
                <article className="list-card tool-management-card" key={task.id}>
                  <div className="list-row">
                    <span className={`pill ${getStatusClass(task.status)}`}>{task.status}</span>
                    <span className={`pill ${getPriorityClass(task.priority)}`}>{task.priority}</span>
                  </div>

                  <h3>{task.title}</h3>
                  <p>{task.description ?? 'No detailed description yet.'}</p>

                  <div className="alert-context">
                    <span className="list-meta">Facility: {task.facility?.name ?? 'Unknown facility'}</span>
                    <span className="list-meta">
                      Tool: {task.tool?.name ?? 'Unknown'} • {task.tool?.type ?? 'N/A'}
                    </span>
                    <span className="list-meta">Assigned to: {task.assignedTo?.name ?? 'unassigned'}</span>
                    <span className="list-meta">
                      Related alert: {task.alert?.alert_type ?? 'None'} ({task.alert?.severity ?? 'N/A'})
                    </span>
                    <span className="list-meta">
                      Updated: {new Date(task.updated_at).toLocaleString()}
                    </span>
                    {task.resolved_at ? (
                      <span className="list-meta">
                        Resolved: {new Date(task.resolved_at).toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => startEdit(task)}>
                      Edit
                    </button>
                    {task.status !== 'resolved' ? (
                      <button className="secondary-button" type="button" onClick={() => handleResolve(task.id)}>
                        Mark completed
                      </button>
                    ) : null}
                    <button className="danger-button" type="button" onClick={() => handleDelete(task.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No maintenance tasks recorded yet.</p>
            )}
          </div>
        </article>
      </section>
    </>
  )
}
