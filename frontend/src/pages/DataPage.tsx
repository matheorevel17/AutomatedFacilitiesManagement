import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { createAlert } from '../api/alerts'
import type { AlertPayload, SimulationData } from '../types/app'

type DataPageProps = {
  data: SimulationData | null
  onAlertCreated: () => void
  onRefresh: () => Promise<void>
}

type AlertDraftState = {
  alert_type: string
  facility_id: string
  message: string
  severity: string
  status: string
  tool_id: string
  triggered_at: string
}

const emptyAlertDraft: AlertDraftState = {
  alert_type: '',
  facility_id: '',
  message: '',
  severity: 'medium',
  status: 'open',
  tool_id: '',
  triggered_at: '',
}

function getStatusClass(status: string) {
  if (status === 'critical') {
    return 'error'
  }

  if (status === 'warning') {
    return 'pending'
  }

  return 'ok'
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

export function DataPage({ data, onAlertCreated, onRefresh }: DataPageProps) {
  const [dataViewMode, setDataViewMode] = useState<'all' | 'latest_batch'>('all')
  const [facilityFilter, setFacilityFilter] = useState('all')
  const [toolFilter, setToolFilter] = useState('all')
  const [alertDraft, setAlertDraft] = useState<AlertDraftState>(emptyAlertDraft)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const toolsForSelectedFacility = data?.tools.filter((tool) => (
    facilityFilter === 'all' || String(tool.facility_id) === facilityFilter
  )) ?? []
  const effectiveToolFilter = toolsForSelectedFacility.some((tool) => String(tool.id) === toolFilter)
    ? toolFilter
    : 'all'

  const readingsForView = dataViewMode === 'latest_batch'
    ? data?.latest_batch_id
      ? data.recent_readings.filter((reading) => reading.ingestion_batch_id === data.latest_batch_id)
      : []
    : data?.recent_readings ?? []

  const selectedReadings = readingsForView.filter((reading) => {
    const readingFacilityId = reading.tool?.facility_id ? String(reading.tool.facility_id) : ''
    const matchesFacility = facilityFilter === 'all' || readingFacilityId === facilityFilter
    const matchesTool = effectiveToolFilter === 'all' || String(reading.tool_id) === effectiveToolFilter

    return matchesFacility && matchesTool
  }) ?? []
  const selectedTool = data?.tools.find((tool) => String(tool.id) === effectiveToolFilter) ?? null
  const abnormalReadings = selectedReadings.filter((reading) => (
    reading.status === 'warning' || reading.status === 'critical'
  ))
  const abnormalReadingsCount = abnormalReadings.length
  const selectedDraftFacilityId = alertDraft.facility_id || (
    data?.facilities[0] ? String(data.facilities[0].id) : ''
  )
  const draftToolsForFacility = data?.tools.filter(
    (tool) => String(tool.facility_id) === selectedDraftFacilityId,
  ) ?? []
  const selectedDraftToolId = alertDraft.tool_id || (draftToolsForFacility[0] ? String(draftToolsForFacility[0].id) : '')

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  function handleFacilityChange(event: ChangeEvent<HTMLSelectElement>) {
    setFacilityFilter(event.target.value)
    setToolFilter('all')
    setActionMessage(null)
  }

  function updateAlertDraft(field: keyof AlertDraftState, value: string) {
    setAlertDraft((current) => {
      if (field === 'facility_id') {
        const firstTool = data?.tools.find((tool) => String(tool.facility_id) === value)

        return {
          ...current,
          facility_id: value,
          tool_id: firstTool ? String(firstTool.id) : '',
        }
      }

      return { ...current, [field]: value }
    })
  }

  function openAlertDraftModal() {
    if (!selectedTool) {
      setActionMessage('Select one automated tool before creating an alert.')
      return
    }

    if (abnormalReadingsCount === 0) {
      setActionMessage('No warning or critical reading found for the selected tool.')
      return
    }

    setActionMessage(null)

    const selectedFacility = data?.facilities.find((facility) => facility.id === selectedTool.facility_id)
    const latestAbnormalReading = [...abnormalReadings].sort(
      (first, second) => new Date(second.recorded_at).getTime() - new Date(first.recorded_at).getTime(),
    )[0]
    const criticalCount = abnormalReadings.filter((reading) => reading.status === 'critical').length
    const severity = criticalCount > 0 ? 'high' : 'medium'

    setAlertDraft({
      alert_type: `Abnormal sensor values - ${selectedFacility?.name ?? 'Unknown facility'} - ${selectedTool.name}`,
      facility_id: String(selectedTool.facility_id),
      message: `${abnormalReadings.length} abnormal readings detected for ${selectedTool.name}. Latest abnormal value: ${latestAbnormalReading.value} ${latestAbnormalReading.unit} (${latestAbnormalReading.status}).`,
      severity,
      status: 'open',
      tool_id: String(selectedTool.id),
      triggered_at: latestAbnormalReading ? toDateTimeLocal(latestAbnormalReading.recorded_at) : getDefaultDateTimeLocal(),
    })
    setIsAlertModalOpen(true)
  }

  function buildAlertPayload(): AlertPayload {
    return {
      alert_type: alertDraft.alert_type.trim(),
      facility_id: Number(selectedDraftFacilityId),
      message: alertDraft.message.trim(),
      severity: alertDraft.severity,
      status: alertDraft.status,
      tool_id: Number(selectedDraftToolId),
      triggered_at: localDateTimeToApiValue(alertDraft.triggered_at),
    }
  }

  async function handleCreateAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsDetecting(true)
    setActionMessage(null)

    try {
      await createAlert(buildAlertPayload())
      await onRefresh()
      onAlertCreated()
      setActionMessage('Alert created successfully.')
      setIsAlertModalOpen(false)
      setAlertDraft(emptyAlertDraft)
    } catch (error) {
      if (error instanceof Error) {
        setActionMessage(error.message)
      }
    } finally {
      setIsDetecting(false)
    }
  }

  return (
    <>
      <section className="hero-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Sensor data</p>
            <h1>Received sensor readings.</h1>
          </div>
          <button className="secondary-button" type="button" disabled={isRefreshing} onClick={handleRefresh}>
            {isRefreshing ? 'Refreshing...' : 'Refresh data'}
          </button>
        </div>
        <p className="lede">
          This page displays the JSON readings received from external tools or from the separated simulator.
        </p>

        <div className="stack-grid">
          <article>
            <span>Total readings</span>
            <strong>{data?.stats.readings ?? 0}</strong>
          </article>
          <article>
            <span>Normal</span>
            <strong>{data?.stats.normal ?? 0}</strong>
          </article>
          <article>
            <span>Warning</span>
            <strong>{data?.stats.warning ?? 0}</strong>
          </article>
          <article>
            <span>Critical</span>
            <strong>{data?.stats.critical ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">History</p>
            <h2>Latest received data</h2>
          </div>
        </div>

        <div className="data-filter-row">
          <label className="list-filter">
            <span>Data view</span>
            <select
              value={dataViewMode}
              onChange={(event) => {
                setDataViewMode(event.target.value as 'all' | 'latest_batch')
                setActionMessage(null)
              }}
            >
              <option value="all">All recent data</option>
              <option value="latest_batch">Latest sent batch</option>
            </select>
          </label>

          <label className="list-filter">
            <span>Facility</span>
            <select value={facilityFilter} onChange={handleFacilityChange}>
              <option value="all">All facilities</option>
              {data?.facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>

          <label className="list-filter">
            <span>Automated tool</span>
            <select
              value={effectiveToolFilter}
              onChange={(event) => {
                setToolFilter(event.target.value)
                setActionMessage(null)
              }}
            >
              <option value="all">All tools</option>
              {toolsForSelectedFacility.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name} ({tool.unit})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="data-actions-row">
          <button
            className="secondary-button"
            type="button"
            disabled={isDetecting || !selectedTool || abnormalReadingsCount === 0}
            onClick={openAlertDraftModal}
          >
            Create alert from abnormal data
          </button>
          <p className="empty-state">
            {selectedTool
              ? `${abnormalReadingsCount} warning/critical readings for the selected tool.`
              : 'Select one tool to create an alert from abnormal readings.'}
          </p>
        </div>

        {actionMessage ? <p className="form-error">{actionMessage}</p> : null}

        <div className="data-table-wrap">
          {selectedReadings.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Facility</th>
                  <th>Tool</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedReadings.map((reading) => (
                  <tr key={reading.id}>
                    <td>{new Date(reading.recorded_at).toLocaleString()}</td>
                    <td>{reading.tool?.facility?.name ?? 'Unknown facility'}</td>
                    <td>{reading.tool?.name ?? 'Unknown tool'}</td>
                    <td>
                      {reading.value} {reading.unit}
                    </td>
                    <td>
                      <span className={`pill ${getStatusClass(reading.status)}`}>{reading.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No sensor readings match the selected filters.</p>
          )}
        </div>
      </section>

      {isAlertModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="data-alert-form-title">
            <div className="section-head">
              <div>
                <p className="eyebrow">Alert from data</p>
                <h2 id="data-alert-form-title">Review alert before creating</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsAlertModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="management-form" onSubmit={handleCreateAlert}>
              <label>
                <span>Alert type</span>
                <input
                  value={alertDraft.alert_type}
                  onChange={(event) => updateAlertDraft('alert_type', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Facility</span>
                <select
                  value={selectedDraftFacilityId}
                  onChange={(event) => updateAlertDraft('facility_id', event.target.value)}
                  required
                >
                  {data?.facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Automated tool</span>
                <select
                  value={selectedDraftToolId}
                  onChange={(event) => updateAlertDraft('tool_id', event.target.value)}
                  required
                >
                  {draftToolsForFacility.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label>
                  <span>Severity</span>
                  <select
                    value={alertDraft.severity}
                    onChange={(event) => updateAlertDraft('severity', event.target.value)}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select value={alertDraft.status} onChange={(event) => updateAlertDraft('status', event.target.value)}>
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
                  value={alertDraft.triggered_at}
                  onChange={(event) => updateAlertDraft('triggered_at', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Message</span>
                <textarea
                  value={alertDraft.message}
                  onChange={(event) => updateAlertDraft('message', event.target.value)}
                  required
                />
              </label>

              {actionMessage ? <p className="form-error">{actionMessage}</p> : null}

              <div className="card-actions">
                <button type="submit" disabled={isDetecting || !selectedDraftToolId}>
                  {isDetecting ? 'Creating...' : 'Create alert'}
                </button>
                <button className="secondary-button" type="button" onClick={() => setIsAlertModalOpen(false)}>
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
