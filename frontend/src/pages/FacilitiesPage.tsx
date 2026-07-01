import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFacility, deleteFacility, updateFacility } from '../api/facilities'
import type { FacilitiesData, FacilityPayload } from '../types/app'

type FacilitiesPageProps = {
  facilitiesData: FacilitiesData | null
  selectedFacilityId: number | null
  onDataChanged: () => Promise<void>
  onLogout: () => void
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
  onLogout,
  onSelectedFacilityChange,
}: FacilitiesPageProps) {
  const [form, setForm] = useState<FacilityFormState>(emptyForm)
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedFacility =
    facilitiesData?.facilities.find((facility) => facility.id === selectedFacilityId) ??
    facilitiesData?.facilities[0] ??
    null

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

  async function handleDelete(facilityId: number) {
    if (!window.confirm('Delete this facility? Linked tools, readings, alerts, and maintenance tasks will also be removed.')) {
      return
    }

    setFormError(null)

    try {
      await deleteFacility(facilityId)
      await onDataChanged()

      if (editingFacilityId === facilityId) {
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

          <section className="section-panel">
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
                    <span className={`pill ${getStatusClass(facility.status)}`}>{facility.status}</span>
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
                    <button className="danger-button" type="button" onClick={() => handleDelete(selectedFacility.id)}>
                      Delete
                    </button>
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
                  {selectedFacility.automated_tools.map((tool) => (
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
