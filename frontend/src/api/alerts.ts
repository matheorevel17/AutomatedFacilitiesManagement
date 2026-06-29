import type { AlertsData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchAlerts() {
  return readJson<AlertsData>(await apiFetch('/alerts'), 'Alerts failed')
}
