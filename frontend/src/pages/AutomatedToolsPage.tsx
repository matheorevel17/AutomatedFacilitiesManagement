import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createAutomatedTool,
  updateAutomatedTool,
} from '../api/automatedTools'
import { Pagination } from '../components/Pagination'
import type { AutomatedToolPayload, AutomatedToolsData } from '../types/app'

type AutomatedToolsPageProps = {
  automatedToolsData: AutomatedToolsData | null
  onDataChanged: () => Promise<void>
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

type ModalMode = 'details' | 'form' | null

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

const itemsPerPage = 8

function getReportingPillClass(level: string) {
  if (level === 'online') {
    return 'ok'
  }

  if (level === 'delayed') {
    return 'pending'
  }

  return 'error'
}

function formatLastReceived(minutes: number | null) {
  if (minutes === null) {
    return 'No data received yet'
  }

  if (minutes < 1) {
    return 'Less than 1 minute ago'
  }

  if (minutes === 1) {
    return '1 minute ago'
  }

  return `${minutes} minutes ago`
}

export function AutomatedToolsPage({ automatedToolsData, onDataChanged }: AutomatedToolsPageProps) {
  const [form, setForm] = useState<ToolFormState>(emptyForm)
  const [facilityFilterId, setFacilityFilterId] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingToolId, setEditingToolId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null)

  const selectedFacilityId = form.facility_id || (
    automatedToolsData?.facilities[0] ? String(automatedToolsData.facilities[0].id) : ''
  )
  const filteredTools = automatedToolsData?.tools.filter((tool) => (
    facilityFilterId === 'all' || String(tool.facility_id) === facilityFilterId
  )) ?? []
  const selectedFilterFacility = automatedToolsData?.facilities.find(
    (facility) => String(facility.id) === facilityFilterId,
  )
  const totalPages = Math.max(1, Math.ceil(filteredTools.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTools = filteredTools.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  )
  const selectedTool = automatedToolsData?.tools.find((tool) => tool.id === selectedToolId) ?? null

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
    setModalMode(null)
  }

  function openCreateModal() {
    setEditingToolId(null)
    setForm({
      ...emptyForm,
      facility_id: automatedToolsData?.facilities[0] ? String(automatedToolsData.facilities[0].id) : '',
    })
    setFormError(null)
    setModalMode('form')
  }

  function openDetailsModal(tool: AutomatedToolsData['tools'][number]) {
    setSelectedToolId(tool.id)
    setModalMode('details')
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
    setModalMode('form')
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

  async function handleMarkInactive(tool: AutomatedToolsData['tools'][number]) {
    if (tool.status === 'inactive') {
      return
    }

    setFormError(null)

    try {
      await updateAutomatedTool(tool.id, {
        facility_id: tool.facility_id,
        installation_date: tool.installation_date,
        location: tool.location,
        name: tool.name,
        normal_max: Number(tool.normal_max),
        normal_min: Number(tool.normal_min),
        status: 'inactive',
        type: tool.type,
        unit: tool.unit,
      })
      await onDataChanged()

      if (editingToolId === tool.id) {
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
            <p className="eyebrow">Automated tools module</p>
            <h1>Manage sensors and controllers.</h1>
          </div>
        </div>
        <p className="lede">
          Add, edit, link, and monitor automated tools attached to the facilities.
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

        <div className="stack-grid compact-grid">
          <article>
            <span>Reporting</span>
            <strong>{automatedToolsData?.stats.reporting ?? 0}</strong>
          </article>
          <article>
            <span>Delayed</span>
            <strong>{automatedToolsData?.stats.delayed ?? 0}</strong>
          </article>
          <article>
            <span>Not reporting / no data</span>
            <strong>{automatedToolsData?.stats.not_reporting ?? 0}</strong>
          </article>
          <article>
            <span>Rule</span>
            <strong>10 min / 30 min</strong>
          </article>
        </div>
      </section>

      <section className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Tool inventory</p>
              <h2>{selectedFilterFacility ? `${selectedFilterFacility.name} tools` : 'All automated tools'}</h2>
            </div>
            <button className="secondary-button" type="button" onClick={openCreateModal}>
              Add automated tool
            </button>
          </div>

          <label className="list-filter">
            <span>Display</span>
            <select
              value={facilityFilterId}
              onChange={(event) => {
                setFacilityFilterId(event.target.value)
                setCurrentPage(1)
                setSelectedToolId(null)
              }}
            >
              <option value="all">All facilities</option>
              {automatedToolsData?.facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>

          <div className="tool-list">
            {paginatedTools.length ? (
              paginatedTools.map((tool) => (
                <article className="list-card tool-management-card" key={tool.id}>
                  <div className="list-row">
                    <span className={`pill ${tool.status === 'active' ? 'ok' : 'pending'}`}>{tool.status}</span>
                    <span className="list-meta">{tool.facility?.name ?? 'Unknown facility'}</span>
                  </div>
                  <span className={`pill ${getReportingPillClass(tool.reporting_level)}`}>
                    {tool.reporting_status}
                  </span>

                  <h3>{tool.name}</h3>
                  <p>{tool.facility?.name ?? 'Unknown facility'} • {tool.location}</p>

                  <div className="alert-context">
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
                    <button className="secondary-button" type="button" onClick={() => openDetailsModal(tool)}>
                      View details
                    </button>
                    <button className="secondary-button" type="button" onClick={() => startEdit(tool)}>
                      Edit
                    </button>
                    {tool.status !== 'inactive' ? (
                      <button className="secondary-button" type="button" onClick={() => handleMarkInactive(tool)}>
                        Mark inactive
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No automated tools match this facility filter.</p>
            )}
          </div>

          <Pagination
            currentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            totalItems={filteredTools.length}
          />
      </section>

      {modalMode === 'form' ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="tool-form-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">{editingToolId ? 'Edit tool' : 'New tool'}</p>
                <h2 id="tool-form-title">{editingToolId ? 'Update automated tool' : 'Add automated tool'}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={resetForm}>
                Close
              </button>
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

              <div className="card-actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingToolId ? 'Update tool' : 'Create tool'}
                </button>
                <button className="secondary-button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {modalMode === 'details' && selectedTool ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="tool-detail-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">Tool details</p>
                <h2 id="tool-detail-title">{selectedTool.name}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setModalMode(null)}>
                Close
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span className="list-meta">Facility</span>
                <strong>{selectedTool.facility?.name ?? 'Unknown facility'}</strong>
              </div>
              <div>
                <span className="list-meta">Reporting status</span>
                <strong>{selectedTool.reporting_status}</strong>
              </div>
              <div>
                <span className="list-meta">Type</span>
                <strong>{selectedTool.type}</strong>
              </div>
              <div>
                <span className="list-meta">Location</span>
                <strong>{selectedTool.location}</strong>
              </div>
              <div>
                <span className="list-meta">Last received</span>
                <strong>{formatLastReceived(selectedTool.minutes_since_last_reading)}</strong>
              </div>
              <div>
                <span className="list-meta">Normal range</span>
                <strong>
                  {selectedTool.normal_min} to {selectedTool.normal_max} {selectedTool.unit}
                </strong>
              </div>
              <div>
                <span className="list-meta">Latest value</span>
                <strong>
                  {selectedTool.latest_sensor_reading
                    ? `${selectedTool.latest_sensor_reading.value} ${selectedTool.latest_sensor_reading.unit} • ${selectedTool.latest_sensor_reading.status}`
                    : 'No reading yet'}
                </strong>
              </div>
              <div>
                <span className="list-meta">Open alerts</span>
                <strong>{selectedTool.open_alerts_count}</strong>
              </div>
              <div>
                <span className="list-meta">Installation date</span>
                <strong>{selectedTool.installation_date ?? 'Not set'}</strong>
              </div>
              <div>
                <span className="list-meta">Tool status</span>
                <strong>{selectedTool.status}</strong>
              </div>
            </div>

            <div className="reference-note">
              <span className="list-meta">Range review</span>
              <p>{selectedTool.normal_reference_note}</p>
            </div>

            <div className="card-actions">
              <button className="secondary-button" type="button" onClick={() => startEdit(selectedTool)}>
                Edit tool
              </button>
              <button className="secondary-button" type="button" onClick={() => setModalMode(null)}>
                Close details
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
