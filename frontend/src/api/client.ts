const apiUrl = window.__APP_CONFIG__?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
let csrfToken: string | null = null

function requestNeedsCsrf(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

async function fetchCsrfToken() {
  const response = await fetch(`${apiUrl}/csrf-token`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`CSRF token failed with ${response.status}`)
  }

  const data = (await response.json()) as { csrf_token: string }
  csrfToken = data.csrf_token
  return csrfToken
}

async function prepareHeaders(options: RequestInit, forceNewCsrfToken = false) {
  const headers = new Headers(options.headers ?? {})
  const method = options.method ?? 'GET'

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (requestNeedsCsrf(method)) {
    const token = forceNewCsrfToken || !csrfToken ? await fetchCsrfToken() : csrfToken
    headers.set('X-CSRF-TOKEN', token)
  }

  return headers
}

export function clearCsrfToken() {
  csrfToken = null
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = options.method ?? 'GET'
  const headers = await prepareHeaders(options)

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  if (response.status === 419 && requestNeedsCsrf(method)) {
    clearCsrfToken()

    return fetch(`${apiUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: await prepareHeaders(options, true),
    })
  }

  return response
}

export async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { errors?: Record<string, string | string[]>; message?: string }
      | null

    const firstValidationError = errorPayload?.errors
      ? Object.values(errorPayload.errors).flat()[0]
      : null

    throw new Error(firstValidationError ?? errorPayload?.message ?? `${errorMessage} with ${response.status}`)
  }

  return (await response.json()) as T
}
