import { useState } from 'react'
import type { FormEvent } from 'react'
import { createAlert, updateAlert, updateAlertStatus } from '../api/alerts'
import { Pagination } from '../components/Pagination'
import type { AlertPayload, AlertsData } from '../types/app'

type AlertsPageProps = {
  alertsData: AlertsData | null
  onDataChanged: () => Promise<void>
}

type AlertFormState = {
  alert_type: string
  facility_id: string
  message: string
  severity: string
  status: string
  tool_id: string
  triggered_at: string
}

const emptyForm: AlertFormState = {
  alert_type: '',
  facility_id: '',
  message: '',
  severity: 'medium',
  status: 'open',
  tool_id: '',
  triggered_at: '',
}

const itemsPerPage = 8

function getSeverityClass(severity: string) {
  if (severity === 'critical' || severity === 'high') {
    return 'error'
  }

  if (severity === 'medium') {
    return 'pending'
  }

  return 'ok'
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

function toDateTimeLocal(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16)
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

function getDefaultDateTimeLocal() {
  const now = new Date()
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

function localDateTimeToApiValue(value: string) {
  return new Date(value).toISOString()
}

export function AlertsPage({ alertsData, onDataChanged }: AlertsPageProps) {
  const [form, setForm] = useState<AlertFormState>({
    ...emptyForm,
    triggered_at: getDefaultDateTimeLocal(),
  })
  const [facilityFilterId, setFacilityFilterId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingAlertId, setEditingAlertId] = useState<number | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedFacilityId = form.facility_id || (
    alertsData?.facilities[0] ? String(alertsData.facilities[0].id) : ''
  )

  const toolsForFacility = alertsData?.tools.filter(
    (tool) => String(tool.facility_id) === selectedFacilityId,
  ) ?? []

  const selectedToolId = form.tool_id || (toolsForFacility[0] ? String(toolsForFacility[0].id) : '')
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredAlerts = alertsData?.alerts.filter((alert) => {
    const matchesFacility = facilityFilterId === 'all' || String(alert.facility_id) === facilityFilterId
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
    const searchableText = [
      alert.alert_type,
      alert.message,
      alert.facility?.name,
      alert.facility?.location,
      alert.tool?.name,
      alert.tool?.type,
    ].join(' ').toLowerCase()
    const matchesSearch = !normalizedSearchQuery || searchableText.includes(normalizedSearchQuery)

    return matchesFacility && matchesStatus && matchesSearch
  }) ?? []
  const selectedFilterFacility = alertsData?.facilities.find(
    (facility) => String(facility.id) === facilityFilterId,
  )
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedAlerts = filteredAlerts.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  )

  function updateField(field: keyof AlertFormState, value: string) {
    setForm((current) => {
      if (field === 'facility_id') {
        const firstTool = alertsData?.tools.find((tool) => String(tool.facility_id) === value)

        return {
          ...current,
          facility_id: value,
          tool_id: firstTool ? String(firstTool.id) : '',
        }
      }

      return { ...current, [field]: value }
    })
  }

  function resetForm() {
    const firstFacility = alertsData?.facilities[0]
    const firstTool = firstFacility
      ? alertsData?.tools.find((tool) => tool.facility_id === firstFacility.id)
      : null

    setEditingAlertId(null)
    setForm({
      ...emptyForm,
      facility_id: firstFacility ? String(firstFacility.id) : '',
      tool_id: firstTool ? String(firstTool.id) : '',
      triggered_at: getDefaultDateTimeLocal(),
    })
    setFormError(null)
    setIsFormModalOpen(false)
  }

  function openCreateModal() {
    const firstFacility = alertsData?.facilities[0]
    const firstTool = firstFacility
      ? alertsData?.tools.find((tool) => tool.facility_id === firstFacility.id)
      : null

    setEditingAlertId(null)
    setForm({
      ...emptyForm,
      facility_id: firstFacility ? String(firstFacility.id) : '',
      tool_id: firstTool ? String(firstTool.id) : '',
      triggered_at: getDefaultDateTimeLocal(),
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  function startEdit(alert: AlertsData['alerts'][number]) {
    setEditingAlertId(alert.id)
    setForm({
      alert_type: alert.alert_type,
      facility_id: String(alert.facility_id),
      message: alert.message,
      severity: alert.severity,
      status: alert.status,
      tool_id: String(alert.tool_id),
      triggered_at: toDateTimeLocal(alert.triggered_at),
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  function buildPayload(): AlertPayload {
    return {
      alert_type: form.alert_type.trim(),
      facility_id: Number(selectedFacilityId),
      message: form.message.trim(),
      severity: form.severity,
      status: form.status,
      tool_id: Number(selectedToolId),
      triggered_at: localDateTimeToApiValue(form.triggered_at),
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)

    try {
      const payload = buildPayload()

      if (editingAlertId) {
        await updateAlert(editingAlertId, payload)
      } else {
        await createAlert(payload)
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

  async function handleResolve(alertId: number) {
    setFormError(null)

    try {
      await updateAlertStatus(alertId, 'resolved')
      await onDataChanged()
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
            <p className="eyebrow">Alerts module</p>
            <h1>Alerts management.</h1>
          </div>
        </div>
        <p className="lede">
          Create, update, resolve, and track anomalies detected across the automated facilities.
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
              <h2>{selectedFilterFacility ? `${selectedFilterFacility.name} alerts` : 'All current alerts'}</h2>
            </div>
            <button className="secondary-button" type="button" onClick={openCreateModal}>
              Create alert
            </button>
          </div>

          <div className="list-filter-row">
            <label className="list-filter">
              <span>Facility</span>
              <select
                value={facilityFilterId}
                onChange={(event) => {
                  setFacilityFilterId(event.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">All facilities</option>
                {alertsData?.facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="list-filter">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <label className="list-filter">
              <span>Search</span>
              <input
                placeholder="Alert, facility, tool..."
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setCurrentPage(1)
                }}
              />
            </label>
          </div>

          <div className="alerts-grid">
            {paginatedAlerts.length ? (
              paginatedAlerts.map((alert) => (
                <article className="list-card tool-management-card" key={alert.id}>
                  <div className="list-row">
                    <span className={`pill ${getSeverityClass(alert.severity)}`}>{alert.severity}</span>
                    <span className={`pill ${getStatusClass(alert.status)}`}>{alert.status}</span>
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

                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => startEdit(alert)}>
                      Edit
                    </button>
                    {alert.status !== 'resolved' ? (
                      <button className="secondary-button" type="button" onClick={() => handleResolve(alert.id)}>
                        Mark resolved
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No alerts match these filters.</p>
            )}
          </div>

          <Pagination
            currentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            totalItems={filteredAlerts.length}
          />
      </section>

      {isFormModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="alert-form-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">{editingAlertId ? 'Edit alert' : 'New alert'}</p>
                <h2 id="alert-form-title">{editingAlertId ? 'Update alert' : 'Create alert'}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={resetForm}>
                Close
              </button>
            </div>

            <form className="management-form" onSubmit={handleSubmit}>
              <label>
                <span>Alert type</span>
                <input
                  value={form.alert_type}
                  onChange={(event) => updateField('alert_type', event.target.value)}
                  placeholder="possible_water_leak"
                  required
                />
              </label>

              <label>
                <span>Facility</span>
                <select
                  value={selectedFacilityId}
                  onChange={(event) => updateField('facility_id', event.target.value)}
                  required
                >
                  {alertsData?.facilities.map((facility) => (
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

              <div className="form-grid">
                <label>
                  <span>Severity</span>
                  <select value={form.severity} onChange={(event) => updateField('severity', event.target.value)}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                    <option value="open">open</option>
                    <option value="in_progress">in progress</option>
                    <option value="resolved">resolved</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Detected time</span>
                <input
                  type="datetime-local"
                  value={form.triggered_at}
                  onChange={(event) => updateField('triggered_at', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Message</span>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                  required
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <div className="card-actions">
                <button type="submit" disabled={isSaving || !selectedToolId}>
                  {isSaving ? 'Saving...' : editingAlertId ? 'Update alert' : 'Create alert'}
                </button>
                <button className="secondary-button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
