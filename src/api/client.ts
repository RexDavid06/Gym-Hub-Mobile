import type { paths } from './schema'

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

type ApiPath = keyof paths & string
type ApiMethod = 'get' | 'post' | 'put' | 'delete' | 'patch'

let accessToken: string | null = null
let refreshAccessToken: (() => Promise<string | null>) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshAccessToken = handler
}

export async function apiFetch<TResponse, TBody = never>(
  path: ApiPath,
  method: ApiMethod,
  body?: TBody,
  retryAfterRefresh = true,
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: method.toUpperCase(),
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (response.status === 401 && retryAfterRefresh && refreshAccessToken) {
    const freshToken = await refreshAccessToken()
    if (freshToken) return apiFetch<TResponse, TBody>(path, method, body, false)
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = (await response.json()) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      // Keep the status based error if the server returned a non-JSON response.
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as TResponse
  return (await response.json()) as TResponse
}
