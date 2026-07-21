import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig, createReading, createReadings, loadEnvFile, sendPayload } from './lib/simulator-core.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))

async function runBatch(config) {
  const readings = createReadings(config)
  const result = await sendPayload({ readings }, config)

  console.log('Batch sent successfully.')
  console.log(JSON.stringify(result.summary, null, 2))
}

async function runContinuous(config) {
  let index = 0

  console.log(`Continuous mode started. Sending one reading every ${config.intervalMs}ms.`)
  console.log('Press Ctrl+C to stop.')

  async function tick() {
    const reading = createReading(index, config)
    const result = await sendPayload(reading, config)
    const savedReading = result.readings?.[0]

    console.log(
      `${reading.recorded_at} | tool ${reading.tool_id} | ${reading.value} ${reading.unit} | ${savedReading?.status ?? 'stored'}`,
    )

    index += 1
  }

  await tick()
  setInterval(() => {
    tick().catch((error) => {
      console.error(error.message)
    })
  }, config.intervalMs)
}

loadEnvFile(resolve(scriptDir, '.env'))

try {
  const config = buildConfig()

  if (config.mode === 'continuous') {
    await runContinuous(config)
  } else {
    await runBatch(config)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
