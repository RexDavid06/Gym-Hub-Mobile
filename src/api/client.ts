import { ApiError, createApiClient } from '@gym-hub/api-client'

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(
  /\/$/,
  '',
)

let accessToken: string | null = null
let refreshHandler: (() => Promise<string | null>) | null = null

const client = createApiClient({
  baseUrl: apiBaseUrl,
  getAccessToken: () => accessToken,
  refreshAccessToken: () => (refreshHandler ? refreshHandler() : Promise.resolve(null)),
})

export const apiFetch = client.apiFetch
export const buildApiPath = client.buildApiPath
export { ApiError }

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler
}
