import { theme } from '../theme'

export function formatNaira(value?: string | null) {
  if (value === null || value === undefined || value === '') return '—'
  const raw = String(value).trim()
  const negative = raw.startsWith('-')
  const unsigned = negative ? raw.slice(1) : raw
  const [whole = '0', fraction = ''] = unsigned.split('.')
  const major = (whole.replace(/\D/g, '') || '0').replace(/^0+(?=\d)/, '')
  const grouped = major.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const kobo = (fraction.replace(/\D/g, '') + '00').slice(0, 2)
  return `${negative ? '-' : ''}₦${grouped}.${kobo}`
}

function parseDate(value?: string | null) {
  if (!value) return null
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatMemberDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export function methodLabel(method?: string) {
  if (method === 'pos') return 'Card (POS)'
  if (method === 'transfer') return 'Bank transfer'
  if (method === 'cash') return 'Cash'
  if (method === 'other') return 'Other'
  return '—'
}

export type StatusTone = {
  label: string
  color: string
  backgroundColor: string
}

export function subscriptionTone(status?: string, daysLeft = 0): StatusTone {
  if (status === 'expired') {
    return { label: 'Expired', color: theme.colors.danger, backgroundColor: '#FEE2E2' }
  }
  if (status === 'cancelled') {
    return { label: 'Cancelled', color: theme.colors.muted, backgroundColor: '#E2E8F0' }
  }
  if (status === 'active' && daysLeft <= 7) {
    return { label: 'Expiring soon', color: '#B45309', backgroundColor: '#FEF3C7' }
  }
  if (status === 'active') {
    return { label: 'Active', color: theme.colors.success, backgroundColor: '#DCFCE7' }
  }
  return { label: 'No plan', color: theme.colors.muted, backgroundColor: '#E2E8F0' }
}
