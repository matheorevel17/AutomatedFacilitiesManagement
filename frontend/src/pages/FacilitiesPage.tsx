import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFacility, updateFacility } from '../api/facilities'
import { Pagination } from '../components/Pagination'
import type { FacilitiesData, FacilityPayload } from '../types/app'

type FacilitiesPageProps = {
  facilitiesData: FacilitiesData | null
  selectedFacilityId: number | null
  onDataChanged: () => Promise<void>
  onSelectedFacilityChange: (facilityId: number) => void
}

type FacilityFormState = {
  description: string
  location: string
  name: string
  status: string
  type: string
}

const emptyForm: FacilityFormState = {
  description: '',
  location: '',
  name: '',
  status: 'active',
  type: '',
}

const itemsPerPage = 8

function getStatusClass(status: string) {
  if (status === 'critical') {
    return 'error'
  }

  if (status === 'warning' || status === 'inactive') {
    return 'pending'
  }

  return 'ok'
}

export function FacilitiesPage({
  facilitiesData,
  selectedFacilityId,
  onDataChanged,
  onSelectedFacilityChange,
}: FacilitiesPageProps) {
  const [form, setForm] = useState<FacilityFormState>(emptyForm)
  const [alertsPage, setAlertsPage] = useState(1)
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [tasksPage, setTasksPage] = useState(1)
  const [toolsPage, setToolsPage] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedFacility =
    facilitiesData?.facilities.find((facility) => facility.id === selectedFacilityId) ??
    facilitiesData?.facilities[0] ??
    null
  const facilityTools = selectedFacility?.automated_tools ?? []
  const facilityAlerts = selectedFacility?.alerts ?? []
  const facilityTasks = selectedFacility?.maintenance_tasks ?? []
  const toolsTotalPages = Math.max(1, Math.ceil(facilityTools.length / itemsPerPage))
  const alertsTotalPages = Math.max(1, Math.ceil(facilityAlerts.length / itemsPerPage))
  const tasksTotalPages = Math.max(1, Math.ceil(facilityTasks.length / itemsPerPage))
  const safeToolsPage = Math.min(toolsPage, toolsTotalPages)
  const safeAlertsPage = Math.min(alertsPage, alertsTotalPages)
  const safeTasksPage = Math.min(tasksPage, tasksTotalPages)
  const paginatedTools = facilityTools.slice((safeToolsPage - 1) * itemsPerPage, safeToolsPage * itemsPerPage)
  const paginatedAlerts = facilityAlerts.slice((safeAlertsPage - 1) * itemsPerPage, safeAlertsPage * itemsPerPage)
  const paginatedTasks = facilityTasks.slice((safeTasksPage - 1) * itemsPerPage, safeTasksPage * itemsPerPage)

  function resetPagination() {
    setAlertsPage(1)
    setTasksPage(1)
    setToolsPage(1)
  }

  function updateField(field: keyof FacilityFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingFacilityId(null)
    setForm(emptyForm)
    setFormError(null)
  }

  function startEdit(facility: FacilitiesData['facilities'][number]) {
    setEditingFacilityId(facility.id)
    setForm({
      description: facility.description ?? '',
      location: facility.location,
      name: facility.name,
      status: facility.status,
      type: facility.type,
    })
    setFormError(null)
  }

  function buildPayload(): FacilityPayload {
    return {
      description: form.description.trim() || null,
      location: form.location.trim(),
      name: form.name.trim(),
      status: form.status,
      type: form.type.trim(),
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      const payload = buildPayload()

      if (editingFacilityId) {
        await updateFacility(editingFacilityId, payload)
        onSelectedFacilityChange(editingFacilityId)
      } else {
        await createFacility(payload)
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

  async function handleMarkInactive(facility: FacilitiesData['facilities'][number]) {
    if (facility.status === 'inactive') {
      return
    }

    setFormError(null)

    try {
      await updateFacility(facility.id, {
        description: facility.description ?? null,
        location: facility.location,
        name: facility.name,
        status: 'inactive',
        type: facility.type,
      })
      await onDataChanged()

      if (editingFacilityId === facility.id) {
        setForm((current) => ({ ...current, status: 'inactive' }))
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
            <p className="eyebrow">Facilities module</p>
            <h1>Facilities overview.</h1>
          </div>
        </div>
        <p className="lede">
          Browse each facility, inspect its automated tools, and review the most recent alerts and maintenance
          activity linked to it.
        </p>

        <div className="facility-select-row">
          <label className="facility-select-field">
            <span>Display facility</span>
            <select
              value={selectedFacility?.id ?? ''}
              onChange={(event) => {
                const facilityId = Number(event.target.value)

                if (facilityId) {
                  resetPagination()
                  onSelectedFacilityChange(facilityId)
                }
              }}
              disabled={!facilitiesData?.facilities.length}
            >
              {facilitiesData?.facilities.length ? (
                facilitiesData.facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))
              ) : (
                <option value="">No facilities available</option>
              )}
            </select>
          </label>
        </div>
      </section>

      <section className="facilities-layout">
        <article className="facilities-sidebar">
          <section className="section-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">{editingFacilityId ? 'Edit facility' : 'New facility'}</p>
                <h2>{editingFacilityId ? 'Update facility' : 'Add facility'}</h2>
              </div>
              {editingFacilityId ? (
                <button className="secondary-button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="management-form" onSubmit={handleSubmit}>
              <label>
                <span>Name</span>
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
              </label>

              <label>
                <span>Type</span>
                <input value={form.type} onChange={(event) => updateField('type', event.target.value)} required />
              </label>

              <label>
                <span>Location</span>
                <input
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Status</span>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="active">active</option>
                  <option value="warning">warning</option>
                  <option value="critical">critical</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>

              <label>
                <span>Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingFacilityId ? 'Update facility' : 'Add facility'}
              </button>
            </form>
          </section>

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
                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => startEdit(selectedFacility)}>
                      Edit
                    </button>
                    {selectedFacility.status !== 'inactive' ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleMarkInactive(selectedFacility)}
                      >
                        Mark inactive
                      </button>
                    ) : null}
                  </div>
                </div>

                <span className="meta-chip">{selectedFacility.type}</span>

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
                  {paginatedTools.length ? (
                    paginatedTools.map((tool) => (
                      <article className="facility-card" key={tool.id}>
                        <div className="facility-topline">
                          <span className={`pill ${getStatusClass(tool.status)}`}>{tool.status}</span>
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
                    ))
                  ) : (
                    <p className="empty-state">No automated tools for this facility yet.</p>
                  )}
                </div>

                <Pagination
                  currentPage={safeToolsPage}
                  onPageChange={setToolsPage}
                  pageSize={itemsPerPage}
                  totalItems={facilityTools.length}
                />
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
                    {paginatedAlerts.length ? (
                      paginatedAlerts.map((alert) => (
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

                  <Pagination
                    currentPage={safeAlertsPage}
                    onPageChange={setAlertsPage}
                    pageSize={itemsPerPage}
                    totalItems={facilityAlerts.length}
                  />
                </article>

                <article className="list-panel">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Maintenance tasks</p>
                      <h2>Facility tasks</h2>
                    </div>
                  </div>

                  <div className="list-stack">
                    {paginatedTasks.length ? (
                      paginatedTasks.map((task) => (
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

                  <Pagination
                    currentPage={safeTasksPage}
                    onPageChange={setTasksPage}
                    pageSize={itemsPerPage}
                    totalItems={facilityTasks.length}
                  />
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
