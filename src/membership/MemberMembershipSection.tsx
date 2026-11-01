import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { apiFetch } from '../api/client'
import type { components } from '../api/schema'
import { theme } from '../theme'
import { ReceiptsList } from './ReceiptsList'
import { SubscriptionCard } from './SubscriptionCard'

type MyMembership = components['schemas']['MyMembership']

export function MemberMembershipSection() {
  const [membership, setMembership] = useState<MyMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setMembership(await apiFetch<MyMembership>('/api/me/membership/', 'get'))
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load your membership. Check your connection and try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <View style={styles.stateCard}>
        <ActivityIndicator color={theme.colors.navy} />
        <Text style={styles.stateText}>Loading your membership…</Text>
      </View>
    )
  }

  if (error || !membership) {
    return (
      <View style={styles.errorCard}>
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error || 'Unable to load your membership.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void load()}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View>
      <SubscriptionCard subscription={membership.subscription} />
      <ReceiptsList payments={membership.payments} />
    </View>
  )
}

const styles = StyleSheet.create({
  stateCard: {
    marginTop: 18,
    minHeight: 96,
    padding: 18,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateText: { flex: 1, color: theme.colors.muted, fontSize: 15 },
  errorCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  errorText: { color: theme.colors.danger, fontSize: 15, lineHeight: 22 },
  retry: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navy,
  },
  retryPressed: { backgroundColor: theme.colors.navyLight },
  retryText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
})
