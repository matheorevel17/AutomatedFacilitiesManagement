import type { AlertPayload, AlertsData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchAlerts() {
  return readJson<AlertsData>(await apiFetch('/alerts'), 'Alerts failed')
}

export async function createAlert(payload: AlertPayload) {
  return readJson(await apiFetch('/alerts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }), 'Create alert failed')
}

export async function updateAlert(alertId: number, payload: AlertPayload) {
  return readJson(await apiFetch(`/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }), 'Update alert failed')
}

export async function updateAlertStatus(alertId: number, status: string) {
  return readJson(await apiFetch(`/alerts/${alertId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }), 'Update alert status failed')
}
