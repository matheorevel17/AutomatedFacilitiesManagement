import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig, createReadings, loadEnvFile, sendPayload } from './lib/simulator-core.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(scriptDir, 'ui')
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 5174)

loadEnvFile(resolve(scriptDir, '.env'))

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function getRequestConfig(payload) {
  const source = {
    ...process.env,
    API_URL: payload.apiUrl,
    CLOUD_INGESTION_TOKEN: payload.token,
    COUNT: payload.count,
    INTERVAL_MS: payload.intervalMs,
    MEAN: payload.mean,
    NORMAL_MAX: payload.normalMax,
    NORMAL_MIN: payload.normalMin,
    SCENARIO: payload.scenario,
    STANDARD_DEVIATION: payload.standardDeviation,
    TOOL_ID: payload.toolId,
    UNIT: payload.unit,
  }

  return buildConfig(source)
}

function getOptionsUrl(apiUrl) {
  const url = new URL(apiUrl || process.env.API_URL || 'http://localhost:8000/api/cloud/sensor-readings')

  if (url.pathname.endsWith('/sensor-readings')) {
    url.pathname = url.pathname.replace(/\/sensor-readings$/, '/simulator-options')
  } else if (url.pathname.endsWith('/api/cloud')) {
    url.pathname = `${url.pathname}/simulator-options`
  } else {
    url.pathname = '/api/cloud/simulator-options'
  }

  return url.toString()
}

async function handleOptions(request, response) {
  try {
    const payload = await readJsonBody(request)
    const token = payload.token || process.env.CLOUD_INGESTION_TOKEN || ''
    const headers = {
      Accept: 'application/json',
    }

    if (token) {
      headers['X-Cloud-Token'] = token
    }

    const apiResponse = await fetch(getOptionsUrl(payload.apiUrl), { headers })
    const body = await apiResponse.json().catch(() => null)

    if (!apiResponse.ok) {
      throw new Error(body?.message ?? `Options request failed with ${apiResponse.status}`)
    }

    sendJson(response, 200, body)
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error ? error.message : 'Simulator options request failed.',
    })
  }
}

async function handleGenerate(request, response) {
  try {
    const payload = await readJsonBody(request)
    const config = getRequestConfig(payload)
    const readings = createReadings(config)

    sendJson(response, 200, {
      message: 'Readings generated successfully.',
      generated: readings,
      summary: {
        received: readings.length,
        normal: readings.filter((reading) => reading.status === 'normal').length,
        warning: readings.filter((reading) => reading.status === 'warning').length,
        critical: readings.filter((reading) => reading.status === 'critical').length,
      },
    })
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error ? error.message : 'Simulator generation failed.',
    })
  }
}

async function handleSend(request, response) {
  try {
    const payload = await readJsonBody(request)
    const config = getRequestConfig(payload)
    const readings = payload.readings?.length ? payload.readings : createReadings(config)
    const result = await sendPayload({ readings }, config)

    sendJson(response, 200, {
      message: 'Readings sent successfully.',
      sent: result.readings ?? readings,
      summary: result.summary,
    })
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error ? error.message : 'Simulator request failed.',
    })
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname
  const filePath = resolve(publicDir, `.${pathname}`)

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  })
  response.end(readFileSync(filePath))
}

const server = createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/api/options') {
    handleOptions(request, response)
    return
  }

  if (request.method === 'POST' && request.url === '/api/preview') {
    handleGenerate(request, response)
    return
  }

  if (request.method === 'POST' && request.url === '/api/send') {
    handleSend(request, response)
    return
  }

  serveStatic(request, response)
})

server.listen(port, host, () => {
  console.log(`Simulator UI running at http://${host}:${port}`)
})
