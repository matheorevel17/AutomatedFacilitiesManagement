import type { SimulationActionResult, SimulationData, SimulationDetectionPayload, SimulationGeneratePayload } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchSimulationData() {
  return readJson<SimulationData>(await apiFetch('/simulation'), 'Simulation data failed')
}

export async function generateSimulatedData(payload: SimulationGeneratePayload) {
  return readJson<SimulationActionResult>(await apiFetch('/simulation/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }), 'Generate simulated data failed')
}

export async function runDefectDetection(payload: SimulationDetectionPayload) {
  return readJson<SimulationActionResult>(await apiFetch('/simulation/detect', {
    method: 'POST',
    body: JSON.stringify(payload),
  }), 'Run defect detection failed')
}
