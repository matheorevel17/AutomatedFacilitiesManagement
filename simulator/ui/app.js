const form = document.querySelector('#simulator-form')
const configModal = document.querySelector('#config-modal')
const openConfigButton = document.querySelector('#open-config-button')
const openConfigButtonSecondary = document.querySelector('#open-config-button-secondary')
const closeConfigButton = document.querySelector('#close-config-button')
const cancelConfigButton = document.querySelector('#cancel-config-button')
const loadOptionsButton = document.querySelector('#load-options-button')
const facilitySelect = document.querySelector('#facility-select')
const toolSelect = document.querySelector('#tool-select')
const unitInput = document.querySelector('#unit-input')
const normalMinInput = form.elements.normalMin
const normalMaxInput = form.elements.normalMax
const meanInput = form.elements.mean
const referenceCard = document.querySelector('#reference-card')
const statusBox = document.querySelector('#status')
const readingsBody = document.querySelector('#readings-body')
const sendButton = document.querySelector('#send-button')

let facilities = []
let generatedReadings = []
let tools = []

function openConfigModal() {
  configModal.hidden = false
}

function closeConfigModal() {
  configModal.hidden = true
}

function getNumber(formData, name) {
  return Number(formData.get(name))
}

function buildPayload(formData) {
  return {
    apiUrl: String(formData.get('apiUrl')),
    count: getNumber(formData, 'count'),
    intervalMs: getNumber(formData, 'intervalMs'),
    mean: getNumber(formData, 'mean'),
    normalMax: getNumber(formData, 'normalMax'),
    normalMin: getNumber(formData, 'normalMin'),
    scenario: String(formData.get('scenario')),
    standardDeviation: getNumber(formData, 'standardDeviation'),
    token: String(formData.get('token')),
    toolId: getNumber(formData, 'toolId'),
    unit: String(formData.get('unit')),
  }
}

function setStatus(message, type = '') {
  statusBox.className = `status-card ${type}`.trim()
  statusBox.textContent = message
}

function formatThreshold(value, unit) {
  return `${Number(value).toFixed(2)} ${unit}`
}

function renderRangeThresholds(tool) {
  if (!tool.range_thresholds) {
    return ''
  }

  const { critical, normal, rule, warning } = tool.range_thresholds

  return `
    <ul>
      <li><strong>Normal:</strong> ${formatThreshold(normal.min, tool.unit)} to ${formatThreshold(normal.max, tool.unit)}</li>
      <li><strong>Warning:</strong> ${formatThreshold(warning.low_min, tool.unit)} to below ${formatThreshold(warning.low_max, tool.unit)}, or above ${formatThreshold(warning.high_min, tool.unit)} to ${formatThreshold(warning.high_max, tool.unit)}</li>
      <li><strong>Critical:</strong> below ${formatThreshold(critical.below, tool.unit)}, or above ${formatThreshold(critical.above, tool.unit)}</li>
    </ul>
    <p>${rule}</p>
  `
}

function renderOptions(select, options, placeholder) {
  select.innerHTML = ''

  if (!options.length) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = placeholder
    select.append(option)
    return
  }

  for (const item of options) {
    const option = document.createElement('option')
    option.value = String(item.id)
    option.textContent = item.label
    select.append(option)
  }
}

function getToolsForSelectedFacility() {
  return tools.filter((tool) => String(tool.facility_id) === facilitySelect.value)
}

function syncSelectedTool() {
  const selectedTool = tools.find((tool) => String(tool.id) === toolSelect.value)
  generatedReadings = []
  sendButton.disabled = true

  if (!selectedTool) {
    unitInput.value = ''
    referenceCard.innerHTML = '<strong>Reference range</strong><p>Select a tool to load its normal operating range.</p>'
    return
  }

  const normalMin = Number(selectedTool.normal_min)
  const normalMax = Number(selectedTool.normal_max)

  unitInput.value = selectedTool.unit
  normalMinInput.value = selectedTool.normal_min
  normalMaxInput.value = selectedTool.normal_max
  meanInput.value = ((normalMin + normalMax) / 2).toFixed(2)
  referenceCard.innerHTML = `
    <strong>Reference range: ${selectedTool.normal_min} to ${selectedTool.normal_max} ${selectedTool.unit}</strong>
    <p>${selectedTool.normal_reference_note}</p>
    ${renderRangeThresholds(selectedTool)}
  `
}

function syncToolsForFacility() {
  const facilityTools = getToolsForSelectedFacility()

  renderOptions(
    toolSelect,
    facilityTools.map((tool) => ({
      id: tool.id,
      label: `${tool.name} (${tool.unit})`,
    })),
    'No active tools for this facility',
  )
  syncSelectedTool()
}

function renderLoadedOptions(payload) {
  facilities = payload.facilities ?? []
  tools = payload.tools ?? []

  renderOptions(
    facilitySelect,
    facilities.map((facility) => ({
      id: facility.id,
      label: `${facility.name} - ${facility.location}`,
    })),
    'No active facilities available',
  )
  syncToolsForFacility()
}

function renderReadings(readings) {
  readingsBody.innerHTML = ''

  for (const reading of readings) {
    const row = document.createElement('tr')
    const tool = tools.find((candidate) => candidate.id === reading.tool_id)
    const status = reading.status ?? 'sent'

    row.innerHTML = `
      <td>${new Date(reading.recorded_at).toLocaleString()}</td>
      <td>${tool?.name ?? reading.tool_id}</td>
      <td>${reading.value}</td>
      <td>${reading.unit}</td>
      <td><span class="pill ${status}">${status}</span></td>
    `

    readingsBody.append(row)
  }
}

function getSummary(readings) {
  return {
    critical: readings.filter((reading) => reading.status === 'critical').length,
    normal: readings.filter((reading) => reading.status === 'normal').length,
    received: readings.length,
    warning: readings.filter((reading) => reading.status === 'warning').length,
  }
}

function renderSummary(prefix, summary, type = 'ok') {
  setStatus(
    `${prefix} ${summary.received} readings: ${summary.normal} normal, ${summary.warning} warning, ${summary.critical} critical.`,
    type,
  )
}

async function loadOptions() {
  const formData = new FormData(form)

  loadOptionsButton.disabled = true
  loadOptionsButton.textContent = 'Loading...'
  setStatus('Loading facilities and tools from the backend...')

  try {
    const response = await fetch('/api/options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiUrl: String(formData.get('apiUrl')),
        token: String(formData.get('token')),
      }),
    })
    const body = await response.json()

    if (!response.ok) {
      throw new Error(body.message ?? `Options request failed with ${response.status}`)
    }

    renderLoadedOptions(body)
    setStatus(`Loaded ${body.facilities.length} facilities and ${body.tools.length} tools.`, 'ok')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Options request failed.', 'error')
  } finally {
    loadOptionsButton.disabled = false
    loadOptionsButton.textContent = 'Load facilities and tools'
  }
}

openConfigButton.addEventListener('click', openConfigModal)
openConfigButtonSecondary.addEventListener('click', openConfigModal)
closeConfigButton.addEventListener('click', closeConfigModal)
cancelConfigButton.addEventListener('click', closeConfigModal)
configModal.addEventListener('click', (event) => {
  if (event.target === configModal) {
    closeConfigModal()
  }
})
loadOptionsButton.addEventListener('click', loadOptions)
facilitySelect.addEventListener('change', syncToolsForFacility)
toolSelect.addEventListener('change', syncSelectedTool)

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const generateButton = form.querySelector('#generate-button')
  const payload = buildPayload(new FormData(form))

  generateButton.disabled = true
  generateButton.textContent = 'Generating...'
  sendButton.disabled = true
  setStatus('Generating readings locally...')

  try {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = await response.json()

    if (!response.ok) {
      throw new Error(body.message ?? `Request failed with ${response.status}`)
    }

    generatedReadings = body.generated
    renderSummary('Generated', body.summary)
    renderReadings(generatedReadings)
    sendButton.disabled = generatedReadings.length === 0
    closeConfigModal()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Request failed.', 'error')
  } finally {
    generateButton.disabled = false
    generateButton.textContent = 'Generate data'
  }
})

sendButton.addEventListener('click', async () => {
  if (!generatedReadings.length) {
    setStatus('Generate data before sending it.', 'error')
    return
  }

  const payload = {
    ...buildPayload(new FormData(form)),
    readings: generatedReadings,
  }

  sendButton.disabled = true
  sendButton.textContent = 'Sending...'
  setStatus('Sending generated readings to the cloud ingestion API...')

  try {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = await response.json()

    if (!response.ok) {
      throw new Error(body.message ?? `Request failed with ${response.status}`)
    }

    generatedReadings = body.sent
    renderSummary('Sent', body.summary)
    renderReadings(generatedReadings)
  } catch (error) {
    sendButton.disabled = false
    setStatus(error instanceof Error ? error.message : 'Request failed.', 'error')
  } finally {
    sendButton.textContent = 'Send generated data'
  }
})

loadOptions()
