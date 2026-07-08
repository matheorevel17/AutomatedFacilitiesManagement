import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { generateSimulatedData, runDefectDetection } from '../api/simulation'
import type { SimulationActionResult, SimulationData, SimulationGeneratePayload } from '../types/app'

type SimulationPageProps = {
  simulationData: SimulationData | null
  onAlertCreated: () => void
  onDataChanged: () => Promise<void>
}

type SimulationFormState = {
  count: string
  facility_id: string
  mean: string
  normal_max: string
  normal_min: string
  scenario: string
  standard_deviation: string
  tool_id: string
}

const emptyForm: SimulationFormState = {
  count: '20',
  facility_id: '',
  mean: '',
  normal_max: '',
  normal_min: '',
  scenario: 'normal_operation',
  standard_deviation: '1',
  tool_id: '',
}

const simulationFormStorageKey = 'stagebali.simulation.form'

const scenarioLabels: Record<string, string> = {
  normal_operation: 'Normal operation',
  possible_water_leak: 'Possible water leak',
  poor_cooling_performance: 'Poor cooling performance',
  pollution_detected: 'Pollution detected',
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

function loadSavedSimulationForm(): SimulationFormState {
  const savedForm = window.sessionStorage.getItem(simulationFormStorageKey)

  if (!savedForm) {
    return emptyForm
  }

  try {
    return {
      ...emptyForm,
      ...(JSON.parse(savedForm) as Partial<SimulationFormState>),
    }
  } catch {
    return emptyForm
  }
}

export function SimulationPage({ simulationData, onAlertCreated, onDataChanged }: SimulationPageProps) {
  const [form, setForm] = useState<SimulationFormState>(() => loadSavedSimulationForm())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [result, setResult] = useState<SimulationActionResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const selectedFacilityId = form.facility_id || (
    simulationData?.facilities[0] ? String(simulationData.facilities[0].id) : ''
  )

  const toolsForFacility = simulationData?.tools.filter(
    (tool) => String(tool.facility_id) === selectedFacilityId,
  ) ?? []

  const selectedTool = toolsForFacility.find((tool) => String(tool.id) === form.tool_id) ?? toolsForFacility[0] ?? null
  const selectedToolId = selectedTool ? String(selectedTool.id) : ''
  const selectedToolReadings = simulationData?.recent_readings.filter(
    (reading) => String(reading.tool_id) === selectedToolId,
  ) ?? []
  const normalMin = form.normal_min !== '' ? form.normal_min : form.tool_id ? '' : selectedTool?.normal_min || ''
  const normalMax = form.normal_max !== '' ? form.normal_max : form.tool_id ? '' : selectedTool?.normal_max || ''
  const mean = form.mean !== '' ? form.mean : form.tool_id ? '' : (
    selectedTool ? String(((Number(selectedTool.normal_min) + Number(selectedTool.normal_max)) / 2).toFixed(2)) : ''
  )

  useEffect(() => {
    window.sessionStorage.setItem(simulationFormStorageKey, JSON.stringify(form))
  }, [form])

  function updateField(field: keyof SimulationFormState, value: string) {
    setForm((current) => {
      if (field === 'facility_id') {
        const firstTool = simulationData?.tools.find((tool) => String(tool.facility_id) === value)

        return {
          ...current,
          facility_id: value,
          mean: firstTool ? String(((Number(firstTool.normal_min) + Number(firstTool.normal_max)) / 2).toFixed(2)) : '',
          normal_max: firstTool?.normal_max ?? '',
          normal_min: firstTool?.normal_min ?? '',
          tool_id: firstTool ? String(firstTool.id) : '',
        }
      }

      if (field === 'tool_id') {
        const tool = simulationData?.tools.find((candidate) => String(candidate.id) === value)

        return {
          ...current,
          mean: tool ? String(((Number(tool.normal_min) + Number(tool.normal_max)) / 2).toFixed(2)) : current.mean,
          normal_max: tool?.normal_max ?? current.normal_max,
          normal_min: tool?.normal_min ?? current.normal_min,
          tool_id: value,
        }
      }

      if (['mean', 'normal_max', 'normal_min'].includes(field)) {
        return {
          ...current,
          facility_id: current.facility_id || selectedFacilityId,
          tool_id: current.tool_id || selectedToolId,
          [field]: value,
        }
      }

      return { ...current, [field]: value }
    })
  }

  function buildPayload(): SimulationGeneratePayload {
    return {
      count: Number(form.count),
      facility_id: Number(selectedFacilityId),
      mean: Number(mean),
      normal_max: Number(normalMax),
      normal_min: Number(normalMin),
      scenario: form.scenario,
      standard_deviation: Number(form.standard_deviation),
      tool_id: Number(selectedToolId),
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = buildPayload()

    setForm((current) => ({
      ...current,
      facility_id: String(payload.facility_id),
      mean: String(payload.mean),
      normal_max: String(payload.normal_max),
      normal_min: String(payload.normal_min),
      tool_id: String(payload.tool_id),
    }))
    setIsGenerating(true)
    setFormError(null)
    setResult(null)

    try {
      const response = await generateSimulatedData(payload)
      setResult(response)
      await onDataChanged()
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDetect() {
    if (!selectedToolReadings.length) {
      setFormError('Generate simulated data for the selected tool before running defect detection.')
      return
    }

    setIsDetecting(true)
    setFormError(null)
    setResult(null)

    try {
      const response = await runDefectDetection({
        facility_id: Number(selectedFacilityId),
        scenario: form.scenario,
        tool_id: Number(selectedToolId),
      })
      setResult(response)
      await onDataChanged()

      if (response.alert) {
        onAlertCreated()
      }
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
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
            <p className="eyebrow">Simulation module</p>
            <h1>Generate sensor data and detect defects.</h1>
          </div>
        </div>
        <p className="lede">
          Simulate readings for a selected automated tool, then run defect detection to create alerts from abnormal values.
        </p>

        <div className="stack-grid">
          <article>
            <span>Total readings</span>
            <strong>{simulationData?.stats.readings ?? 0}</strong>
          </article>
          <article>
            <span>Normal</span>
            <strong>{simulationData?.stats.normal ?? 0}</strong>
          </article>
          <article>
            <span>Warning</span>
            <strong>{simulationData?.stats.warning ?? 0}</strong>
          </article>
          <article>
            <span>Critical</span>
            <strong>{simulationData?.stats.critical ?? 0}</strong>
          </article>
        </div>
      </section>

      <section className="management-layout">
        <article className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Simulation setup</p>
              <h2>Scenario parameters</h2>
            </div>
          </div>

          <form className="management-form" onSubmit={handleGenerate}>
            <label>
              <span>Facility</span>
              <select
                value={selectedFacilityId}
                onChange={(event) => updateField('facility_id', event.target.value)}
                required
              >
                {simulationData?.facilities.map((facility) => (
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
                    {tool.name} ({tool.unit})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Scenario</span>
              <select value={form.scenario} onChange={(event) => updateField('scenario', event.target.value)}>
                {Object.entries(scenarioLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label>
                <span>Number of data</span>
                <input
                  min="1"
                  max="200"
                  type="number"
                  value={form.count}
                  onChange={(event) => updateField('count', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Std deviation</span>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.standard_deviation}
                  onChange={(event) => updateField('standard_deviation', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                <span>Normal min</span>
                <input
                  step="0.01"
                  type="number"
                  value={normalMin}
                  onChange={(event) => updateField('normal_min', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Normal max</span>
                <input
                  step="0.01"
                  type="number"
                  value={normalMax}
                  onChange={(event) => updateField('normal_max', event.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              <span>Mean value</span>
              <input
                step="0.01"
                type="number"
                value={mean}
                onChange={(event) => updateField('mean', event.target.value)}
                required
              />
            </label>

            {formError ? <p className="form-error">{formError}</p> : null}

            {result ? (
              <article className="status-card">
                <strong>{result.message}</strong>
                {result.summary ? (
                  <p>
                    Generated {result.summary.generated ?? 0} • checked {result.summary.checked ?? 0} • abnormal{' '}
                    {result.summary.abnormal ?? 0} • critical {result.summary.critical}
                  </p>
                ) : null}
              </article>
            ) : null}

            <button type="submit" disabled={isGenerating || !selectedToolId}>
              {isGenerating ? 'Generating...' : 'Generate Simulated Data'}
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={isDetecting || !selectedToolId}
              onClick={handleDetect}
            >
              {isDetecting ? 'Detecting...' : 'Run Defect Detection'}
            </button>
          </form>
        </article>

        <article className="section-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Sensor data history</p>
              <h2>Latest readings for selected tool</h2>
            </div>
          </div>

          <div className="data-table-wrap">
            {selectedToolReadings.length ? (
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
                  {selectedToolReadings.map((reading) => (
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
              <p className="empty-state">No sensor readings for the selected tool yet.</p>
            )}
          </div>
        </article>
      </section>
    </>
  )
}
