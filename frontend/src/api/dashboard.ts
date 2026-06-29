import type { DashboardData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchDashboard() {
  return readJson<DashboardData>(await apiFetch('/dashboard'), 'Dashboard failed')
}
