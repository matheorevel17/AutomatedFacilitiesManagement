import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { runDefectDetection } from '../api/simulation'
import type { SimulationData } from '../types/app'

type DataPageProps = {
  data: SimulationData | null
  onAlertCreated: () => void
  onRefresh: () => Promise<void>
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

export function DataPage({ data, onAlertCreated, onRefresh }: DataPageProps) {
  const [facilityFilter, setFacilityFilter] = useState('all')
  const [toolFilter, setToolFilter] = useState('all')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const toolsForSelectedFacility = data?.tools.filter((tool) => (
    facilityFilter === 'all' || String(tool.facility_id) === facilityFilter
  )) ?? []
  const effectiveToolFilter = toolsForSelectedFacility.some((tool) => String(tool.id) === toolFilter)
    ? toolFilter
    : 'all'

  const selectedReadings = data?.recent_readings.filter((reading) => {
    const readingFacilityId = reading.tool?.facility_id ? String(reading.tool.facility_id) : ''
    const matchesFacility = facilityFilter === 'all' || readingFacilityId === facilityFilter
    const matchesTool = effectiveToolFilter === 'all' || String(reading.tool_id) === effectiveToolFilter

    return matchesFacility && matchesTool
  }) ?? []
  const selectedTool = data?.tools.find((tool) => String(tool.id) === effectiveToolFilter) ?? null
  const abnormalReadingsCount = selectedReadings.filter((reading) => (
    reading.status === 'warning' || reading.status === 'critical'
  )).length

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

  async function handleCreateAlert() {
    if (!selectedTool) {
      setActionMessage('Select one automated tool before creating an alert.')
      return
    }

    if (abnormalReadingsCount === 0) {
      setActionMessage('No warning or critical reading found for the selected tool.')
      return
    }

    setIsDetecting(true)
    setActionMessage(null)

    try {
      const response = await runDefectDetection({
        facility_id: selectedTool.facility_id,
        scenario: 'abnormal_sensor_values',
        tool_id: selectedTool.id,
      })

      await onRefresh()
      setActionMessage(response.message)

      if (response.alert) {
        onAlertCreated()
      }
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
            onClick={handleCreateAlert}
          >
            {isDetecting ? 'Checking data...' : 'Create alert from abnormal data'}
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
    </>
  )
}
