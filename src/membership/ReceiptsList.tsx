import { StyleSheet, Text, View } from 'react-native'

import type { components } from '@gym-hub/api-client'
import { theme } from '../theme'
import { formatMemberDate, formatNaira, methodLabel } from './format'

type Payment = components['schemas']['MembershipPayment']

export function ReceiptsList({ payments }: { payments: Payment[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>Payments and receipts</Text>
        <Text style={styles.count}>{payments.length}</Text>
      </View>

      {payments.length === 0 ? (
        <Text style={styles.empty}>No payments recorded yet.</Text>
      ) : (
        payments.map((payment) => (
          <View key={payment.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.receipt}>{payment.receipt_number}</Text>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: payment.is_voided ? '#FEE2E2' : '#DCFCE7' },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: payment.is_voided ? theme.colors.danger : theme.colors.success },
                  ]}
                >
                  {payment.is_voided ? 'Voided' : 'Paid'}
                </Text>
              </View>
            </View>
            <Text style={styles.amount}>{formatNaira(payment.amount)}</Text>
            <Text style={styles.meta}>
              {methodLabel(payment.method)} ·{' '}
              {formatMemberDate(payment.paid_at ?? payment.created_at)}
            </Text>
            {payment.is_voided && payment.void_reason ? (
              <Text style={styles.voidReason}>Voided: {payment.void_reason}</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 18,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FAFC',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: theme.colors.navy, fontSize: 16, fontWeight: '700' },
  count: { color: theme.colors.muted, fontSize: 13, fontWeight: '600' },
  empty: { marginTop: 10, color: theme.colors.muted, fontSize: 15, lineHeight: 21 },
  row: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  receipt: { flex: 1, color: theme.colors.navy, fontSize: 14, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
  amount: { marginTop: 8, color: theme.colors.text, fontSize: 21, fontWeight: '700' },
  meta: { marginTop: 3, color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  voidReason: { marginTop: 6, color: theme.colors.danger, fontSize: 13, lineHeight: 19 },
})
