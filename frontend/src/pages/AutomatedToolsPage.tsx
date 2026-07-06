import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createAutomatedTool,
  deleteAutomatedTool,
  updateAutomatedTool,
} from '../api/automatedTools'
import type { AutomatedToolPayload, AutomatedToolsData } from '../types/app'

type AutomatedToolsPageProps = {
  automatedToolsData: AutomatedToolsData | null
  onDataChanged: () => Promise<void>
  onLogout: () => void
}

type ToolFormState = {
  facility_id: string
  installation_date: string
  location: string
  name: string
  normal_max: string
  normal_min: string
  status: string
  type: string
  unit: string
}

const emptyForm: ToolFormState = {
  facility_id: '',
  installation_date: '',
  location: '',
  name: '',
  normal_max: '',
  normal_min: '',
  status: 'active',
  type: '',
  unit: '',
}

export function AutomatedToolsPage({ automatedToolsData, onDataChanged, onLogout }: AutomatedToolsPageProps) {
  const [form, setForm] = useState<ToolFormState>(emptyForm)
  const [editingToolId, setEditingToolId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedFacilityId = form.facility_id || (
    automatedToolsData?.facilities[0] ? String(automatedToolsData.facilities[0].id) : ''
  )

  function updateField(field: keyof ToolFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setEditingToolId(null)
    setForm({
      ...emptyForm,
      facility_id: automatedToolsData?.facilities[0] ? String(automatedToolsData.facilities[0].id) : '',
    })
    setFormError(null)
  }

  function startEdit(tool: NonNullable<AutomatedToolsData['tools'][number]>) {
    setEditingToolId(tool.id)
    setForm({
      facility_id: String(tool.facility_id),
      installation_date: tool.installation_date ?? '',
      location: tool.location,
      name: tool.name,
      normal_max: tool.normal_max,
      normal_min: tool.normal_min,
      status: tool.status,
      type: tool.type,
      unit: tool.unit,
    })
    setFormError(null)
  }

  function buildPayload(): AutomatedToolPayload {
    return {
      facility_id: Number(selectedFacilityId),
      installation_date: form.installation_date || null,
      location: form.location.trim(),
      name: form.name.trim(),
      normal_max: Number(form.normal_max),
      normal_min: Number(form.normal_min),
      status: form.status,
      type: form.type.trim(),
      unit: form.unit.trim(),
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      const payload = buildPayload()

      if (editingToolId) {
        await updateAutomatedTool(editingToolId, payload)
      } else {
        await createAutomatedTool(payload)
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

  async function handleDelete(toolId: number) {
    if (!window.confirm('Delete this automated tool? Linked readings, alerts, and tasks may also be removed.')) {
      return
    }

    setFormError(null)

    try {
      await deleteAutomatedTool(toolId)
      await onDataChanged()

      if (editingToolId === toolId) {
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
            <p className="eyebrow">Automated tools module</p>
            <h1>Manage sensors and controllers.</h1>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
        <p className="lede">
          Add, edit, link, and monitor automated tools attached to the Water System and Air Conditioning System.
        </p>

        <div className="stack-grid">
          <article>
            <span>Total tools</span>
            <strong>{automatedToolsData?.stats.total ?? 0}</strong>
          </article>
          <article>
            <span>Active</span>
            <strong>{automatedToolsData?.stats.active ?? 0}</strong>
          </article>
          <article>
            <span>Inactive</span>
            <strong>{automatedToolsData?.stats.inactive ?? 0}</strong>
          </article>
          <article>
            <span>Maintenance</span>
            <strong>{automatedToolsData?.stats.maintenance ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="management-layout">
        <article className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">{editingToolId ? 'Edit tool' : 'New tool'}</p>
              <h2>{editingToolId ? 'Update automated tool' : 'Add automated tool'}</h2>
            </div>
            {editingToolId ? (
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>

          <form className="management-form" onSubmit={handleSubmit}>
            <label>
              <span>Facility</span>
              <select
                value={selectedFacilityId}
                onChange={(event) => updateField('facility_id', event.target.value)}
                required
              >
                {automatedToolsData?.facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>

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

            <div className="form-grid">
              <label>
                <span>Normal min</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.normal_min}
                  onChange={(event) => updateField('normal_min', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Normal max</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.normal_max}
                  onChange={(event) => updateField('normal_max', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                <span>Unit</span>
                <input value={form.unit} onChange={(event) => updateField('unit', event.target.value)} required />
              </label>

              <label>
                <span>Status</span>
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="maintenance">maintenance</option>
                </select>
              </label>
            </div>

            <label>
              <span>Installation date</span>
              <input
                type="date"
                value={form.installation_date}
                onChange={(event) => updateField('installation_date', event.target.value)}
              />
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingToolId ? 'Update tool' : 'Add tool'}
            </button>
          </form>
        </article>

        <article className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Tool inventory</p>
              <h2>All automated tools</h2>
            </div>
          </div>

          <div className="tool-list">
            {automatedToolsData?.tools.length ? (
              automatedToolsData.tools.map((tool) => (
                <article className="list-card tool-management-card" key={tool.id}>
                  <div className="list-row">
                    <span className={`pill ${tool.status === 'active' ? 'ok' : 'pending'}`}>{tool.status}</span>
                    <span className="list-meta">{tool.facility?.name ?? 'Unknown facility'}</span>
                  </div>

                  <h3>{tool.name}</h3>
                  <p>{tool.location}</p>

                  <div className="alert-context">
                    <span className="list-meta">Type: {tool.type}</span>
                    <span className="list-meta">
                      Normal range: {tool.normal_min} to {tool.normal_max} {tool.unit}
                    </span>
                    <span className="list-meta">
                      Latest value:{' '}
                      {tool.latest_sensor_reading
                        ? `${tool.latest_sensor_reading.value} ${tool.latest_sensor_reading.unit}`
                        : 'No reading yet'}
                    </span>
                    <span className="list-meta">{tool.open_alerts_count} open alerts</span>
                  </div>

                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => startEdit(tool)}>
                      Edit
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleDelete(tool.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No automated tools available yet.</p>
            )}
          </div>
        </article>
      </section>
    </>
  )
}
