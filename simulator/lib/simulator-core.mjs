import { existsSync, readFileSync } from 'node:fs'

export function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return
  }

  const lines = readFileSync(envPath, 'utf8').split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }

    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').replace(/^["']|["']$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

export function readNumber(source, name, fallback) {
  const rawValue = source[name]

  if (rawValue === undefined || rawValue === '') {
    return fallback
  }

  const value = Number(rawValue)

  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number.`)
  }

  return value
}

export function readRequiredNumber(source, name) {
  const value = readNumber(source, name)

  if (value === undefined) {
    throw new Error(`${name} is required.`)
  }

  return value
}

function gaussianRandom() {
  const u1 = Math.max(Math.random(), 0.0001)
  const u2 = Math.random()

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function getScenarioMean(baseMean, index, config) {
  const shouldInjectDefect = config.scenario !== 'normal_operation' && index >= config.defectStartIndex

  if (!shouldInjectDefect) {
    return baseMean
  }

  if (['possible_water_leak', 'low_water_level'].includes(config.scenario)) {
    return config.normalMin - config.range * 0.25
  }

  return config.normalMax + config.range * 0.25
}

export function createReading(index, config) {
  const scenarioMean = getScenarioMean(config.mean, index, config)
  const value = scenarioMean + config.standardDeviation * gaussianRandom()

  return {
    tool_id: config.toolId,
    recorded_at: new Date(Date.now() + index * config.intervalMs).toISOString(),
    value: Number(value.toFixed(2)),
    unit: config.unit,
  }
}

export function classifyReadingValue(value, config) {
  if (value >= config.normalMin && value <= config.normalMax) {
    return 'normal'
  }

  const distance = value < config.normalMin ? config.normalMin - value : value - config.normalMax

  return distance > config.range * 0.2 ? 'critical' : 'warning'
}

export function createReadings(config) {
  return Array.from({ length: config.count }, (_, index) => {
    const reading = createReading(index, config)

    return {
      ...reading,
      status: classifyReadingValue(reading.value, config),
    }
  })
}

export async function sendPayload(payload, config) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (config.token) {
    headers['X-Cloud-Token'] = config.token
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`Cloud API failed with ${response.status}: ${JSON.stringify(body)}`)
  }

  return body
}

export function buildConfig(source = process.env) {
  const count = readNumber(source, 'COUNT', 20)
  const normalMin = readRequiredNumber(source, 'NORMAL_MIN')
  const normalMax = readRequiredNumber(source, 'NORMAL_MAX')

  if (normalMax < normalMin) {
    throw new Error('NORMAL_MAX must be greater than or equal to NORMAL_MIN.')
  }

  const unit = source.UNIT || ''

  if (!unit) {
    throw new Error('UNIT is required.')
  }

  return {
    apiUrl: source.API_URL || 'http://localhost:8000/api/cloud/sensor-readings',
    count,
    defectStartIndex: Math.floor(count * 0.45),
    intervalMs: readNumber(source, 'INTERVAL_MS', 5000),
    mean: readRequiredNumber(source, 'MEAN'),
    mode: source.MODE || 'batch',
    normalMax,
    normalMin,
    range: Math.max(normalMax - normalMin, 1),
    scenario: source.SCENARIO || 'normal_operation',
    standardDeviation: Math.max(readNumber(source, 'STANDARD_DEVIATION', 1), 0.01),
    token: source.CLOUD_INGESTION_TOKEN || '',
    toolId: readRequiredNumber(source, 'TOOL_ID'),
    unit,
  }
}
