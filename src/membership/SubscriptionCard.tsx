import { StyleSheet, Text, View } from 'react-native'

import type { components } from '@gym-hub/api-client'
import { theme } from '../theme'
import { formatMemberDate, formatNaira, subscriptionTone } from './format'

type Subscription = components['schemas']['MembershipSubscription']

export function SubscriptionCard({ subscription }: { subscription: Subscription | null }) {
  const tone = subscriptionTone(subscription?.status, subscription?.days_left ?? 0)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR MEMBERSHIP</Text>
        <View style={[styles.pill, { backgroundColor: tone.backgroundColor }]}>
          <Text style={[styles.pillText, { color: tone.color }]}>{tone.label}</Text>
        </View>
      </View>

      {subscription ? (
        <>
          <Text style={styles.plan}>{subscription.plan.name}</Text>
          <Text style={styles.price}>
            {formatNaira(subscription.price)} · {subscription.plan.duration_days} days
          </Text>
          <View style={styles.details}>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Expiry date</Text>
              <Text style={styles.detailValue}>{formatMemberDate(subscription.end_date)}</Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Days left</Text>
              <Text style={[styles.detailValue, { color: tone.color }]}>
                {subscription.status === 'active' ? subscription.days_left : 0}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.empty}>No active plan. Please contact your gym.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    padding: 18,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FAFC',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eyebrow: {
    color: theme.colors.navy,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  pill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
  plan: { marginTop: 12, color: theme.colors.navy, fontSize: 24, fontWeight: '700' },
  price: { marginTop: 4, color: theme.colors.muted, fontSize: 15, lineHeight: 21 },
  details: { flexDirection: 'row', gap: 12, marginTop: 16 },
  detail: {
    flex: 1,
    minHeight: 68,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
  },
  detailLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '600' },
  detailValue: { marginTop: 4, color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  empty: { marginTop: 12, color: theme.colors.muted, fontSize: 16, lineHeight: 23 },
})
