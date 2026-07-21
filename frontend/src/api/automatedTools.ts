import type { AutomatedToolPayload, AutomatedToolsData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchAutomatedTools() {
  return readJson<AutomatedToolsData>(await apiFetch('/automated-tools'), 'Automated tools failed')
}

export async function createAutomatedTool(payload: AutomatedToolPayload) {
  return readJson(await apiFetch('/automated-tools', {
    method: 'POST',
    body: JSON.stringify(payload),
  }), 'Create automated tool failed')
}

export async function updateAutomatedTool(toolId: number, payload: AutomatedToolPayload) {
  return readJson(await apiFetch(`/automated-tools/${toolId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }), 'Update automated tool failed')
}
