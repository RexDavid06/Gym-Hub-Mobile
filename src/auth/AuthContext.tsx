import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { apiFetch, setAccessToken, setRefreshHandler } from '../api/client'
import type { components } from '../api/schema'

type Profile = components['schemas']['Me']
type TokenPair = components['schemas']['TokenPair']
type AuthContextValue = {
  profile: Profile | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  redeemInvite: (code: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const ACCESS_TOKEN_KEY = 'gym-hub-access-token'
const REFRESH_TOKEN_KEY = 'gym-hub-refresh-token'
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (!refreshToken) return null
    try {
      const result = await apiFetch<components['schemas']['TokenRefreshResponse'], { refresh: string }>(
        '/api/token/refresh/',
        'post',
        { refresh: refreshToken },
        false,
      )
      setAccessToken(result.access)
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, result.access)
      if (result.refresh) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refresh)
      }
      return result.access
    } catch {
      await clearTokens()
      setProfile(null)
      return null
    }
  }, [])

  const clearTokens = async () => {
    setAccessToken(null)
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ])
  }

  const loadProfile = useCallback(async () => {
    const result = await apiFetch<Profile>('/api/me/', 'get')
    setProfile(result)
  }, [])

  useEffect(() => {
    setRefreshHandler(refresh)
    const restoreSession = async () => {
      try {
        const storedAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
        if (storedAccess) setAccessToken(storedAccess)
        if (storedAccess || (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY))) {
          await loadProfile()
        }
      } catch {
        await clearTokens()
      } finally {
        setLoading(false)
      }
    }
    void restoreSession()
    return () => setRefreshHandler(null)
  }, [loadProfile, refresh])

  const saveAndLoadProfile = useCallback(
    async (tokens: TokenPair) => {
      setAccessToken(tokens.access)
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh),
      ])
      await loadProfile()
    },
    [loadProfile],
  )

  const login = useCallback(
    async (phone: string, password: string) => {
      const tokens = await apiFetch<TokenPair, { phone: string; password: string }>(
        '/api/token/',
        'post',
        { phone, password },
        false,
      )
      await saveAndLoadProfile(tokens)
    },
    [saveAndLoadProfile],
  )

  const redeemInvite = useCallback(
    async (code: string, password: string) => {
      const tokens = await apiFetch<TokenPair, { code: string; password: string }>(
        '/api/auth/redeem-invite/',
        'post',
        { code, password },
        false,
      )
      await saveAndLoadProfile(tokens)
    },
    [saveAndLoadProfile],
  )

  const logout = useCallback(async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      try {
        await apiFetch<undefined, { refresh: string }>(
          '/api/auth/logout/',
          'post',
          { refresh: refreshToken },
          false,
        )
      } catch {
        // The token may already be expired or revoked; signing out locally still applies.
      }
    }
    await clearTokens()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({ profile, loading, login, redeemInvite, logout }),
    [profile, loading, login, redeemInvite, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
