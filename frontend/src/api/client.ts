const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers ?? {})

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })
}

export async function readJson<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage} with ${response.status}`)
  }

  return (await response.json()) as T
}
