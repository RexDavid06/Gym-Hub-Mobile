import { StyleSheet, Text } from 'react-native'

import type { components } from '@gym-hub/api-client'
import { theme } from '../theme'

type BranchSummary = components['schemas']['BranchSummary']

export function BranchLine({
  branch,
  prefix = 'Branch',
}: {
  branch: BranchSummary | null | undefined
  prefix?: string
}) {
  return (
    <Text style={styles.line}>
      {prefix}: {branch?.name ?? 'Not assigned'}
    </Text>
  )
}

const styles = StyleSheet.create({
  line: { marginTop: 6, color: theme.colors.muted, fontSize: 14 },
})
