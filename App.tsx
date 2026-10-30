import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { apiFetch } from './src/api/client'
import type { components } from './src/api/schema'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { theme } from './src/theme'

type Profile = components['schemas']['Me']
type TrainerMember = components['schemas']['UserList']
type MemberTrainer = components['schemas']['MemberTrainer']

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { profile, loading, login, redeemInvite, logout } = useAuth()
  const [screen, setScreen] = useState<'login' | 'invite'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingScreen label="Restoring your session…" />
  if (profile) return <RoleHome profile={profile} onLogout={logout} />

  return (
    <Screen>
      <Card>
        <Brand />
        <Text style={styles.title}>{screen === 'login' ? 'Welcome back' : 'Enter invite code'}</Text>
        <Text style={styles.copy}>
          {screen === 'login' ? 'Sign in with your phone number.' : 'Set a password to join your gym.'}
        </Text>
        {screen === 'login' ? (
          <>
            <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" keyboardType="phone-pad" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <ActionButton
              label="Sign in"
              busy={busy}
              onPress={() => void run(() => login(phone.trim(), password))}
            />
            <LinkButton label="I have an invite code" onPress={() => { setError(''); setScreen('invite') }} />
          </>
        ) : (
          <>
            <Field label="Invite code" value={code} onChangeText={setCode} placeholder="Paste your invite code" autoCapitalize="none" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry />
            <Text style={styles.hint}>
              The current API cannot preview an invitee name. Redeem the code to sign in; your profile details will then appear here.
            </Text>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <ActionButton
              label="Redeem invite"
              busy={busy}
              onPress={() => void run(() => redeemInvite(code.trim(), password))}
            />
            <LinkButton label="Back to sign in" onPress={() => { setError(''); setScreen('login') }} />
          </>
        )}
      </Card>
    </Screen>
  )
}

function RoleHome({ profile, onLogout }: { profile: Profile; onLogout: () => Promise<void> }) {
  if (profile.role === 'trainer') return <TrainerHome profile={profile} onLogout={onLogout} />
  if (profile.role === 'member') return <MemberHome profile={profile} onLogout={onLogout} />
  return <StaffHome profile={profile} onLogout={onLogout} />
}

function StaffHome({ profile, onLogout }: { profile: Profile; onLogout: () => Promise<void> }) {
  return (
    <Screen>
      <Card>
        <Brand />
        <Text style={styles.title}>Gym Hub Web</Text>
        <Text style={styles.copy}>Welcome, {profile.name || profile.phone}.</Text>
        <Text style={styles.gymName}>{profile.gym?.name ?? 'Gym not assigned'}</Text>
        <Text style={styles.hint}>
          Owners and admins can manage their gym from the Gym Hub web dashboard.
        </Text>
        <Text style={styles.role}>Signed in as {profile.role}</Text>
        <ActionButton label="Log out" onPress={() => void onLogout()} />
      </Card>
    </Screen>
  )
}

function TrainerHome({ profile, onLogout }: { profile: Profile; onLogout: () => Promise<void> }) {
  const [members, setMembers] = useState<TrainerMember[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setMembers(null)
    setError('')
    try {
      setMembers(await apiFetch<TrainerMember[]>('/api/me/members/', 'get'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your members.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Screen>
      <Card>
        <Brand />
        <Text style={styles.title}>Trainer home</Text>
        <Text style={styles.copy}>Welcome, {profile.name || profile.phone}.</Text>
        <Text style={styles.gymName}>{profile.gym?.name ?? 'Gym not assigned'}</Text>
        <Text style={styles.sectionLabel}>Assigned members</Text>
        {members === null && !error ? <LoadingBlock label="Loading your members…" /> : null}
        {error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <ActionButton label="Try again" onPress={() => void load()} />
          </>
        ) : null}
        {members !== null && members.length === 0 ? (
          <Text style={styles.hint}>
            No members are assigned to you yet. Your gym admin can assign members from the web
            dashboard.
          </Text>
        ) : null}
        {members?.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>{member.name || 'Unnamed member'}</Text>
            <Text style={styles.memberMeta}>{member.phone}</Text>
          </View>
        ))}
        <ActionButton label="Log out" onPress={() => void onLogout()} />
      </Card>
    </Screen>
  )
}

function MemberHome({ profile, onLogout }: { profile: Profile; onLogout: () => Promise<void> }) {
  const [assignment, setAssignment] = useState<MemberTrainer | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoaded(false)
    setError('')
    try {
      setAssignment(await apiFetch<MemberTrainer>('/api/me/trainer/', 'get'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your trainer.')
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Screen>
      <Card>
        <Brand />
        <Text style={styles.title}>Member home</Text>
        <Text style={styles.copy}>Welcome, {profile.name || profile.phone}.</Text>
        <Text style={styles.gymName}>{profile.gym?.name ?? 'Gym not assigned'}</Text>
        <Text style={styles.sectionLabel}>Your trainer</Text>
        {!loaded && !error ? <LoadingBlock label="Loading your trainer…" /> : null}
        {error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <ActionButton label="Try again" onPress={() => void load()} />
          </>
        ) : null}
        {loaded && !error && !assignment?.trainer ? (
          <Text style={styles.hint}>
            No trainer is assigned to you yet. Your gym admin will assign one.
          </Text>
        ) : null}
        {assignment?.trainer ? (
          <View style={styles.memberRow}>
            <Text style={styles.memberName}>{assignment.trainer.name || 'Your trainer'}</Text>
            <Text style={styles.memberMeta}>{assignment.trainer.phone}</Text>
          </View>
        ) : null}
        <ActionButton label="Log out" onPress={() => void onLogout()} />
      </Card>
    </Screen>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={theme.colors.navy} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

function Brand() {
  return (
    <>
      <View style={styles.mark}><Text style={styles.markText}>GH</Text></View>
      <Text style={styles.eyebrow}>GYM HUB</Text>
    </>
  )
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={theme.colors.muted}
        autoComplete={inputProps.secureTextEntry ? 'password' : inputProps.autoComplete}
      />
    </View>
  )
}

function ActionButton({ label, busy, onPress }: { label: string; busy?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, busy && styles.buttonBusy]}
    >
      {busy ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  )
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.linkButton}><Text style={styles.linkText}>{label}</Text></Pressable>
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text accessibilityRole="alert" style={styles.error}>{children}</Text>
}

function LoadingScreen({ label }: { label: string }) {
  return <View style={[styles.screen, styles.loading]}><ActivityIndicator color={theme.colors.navy} size="large" /><Text style={styles.copy}>{label}</Text></View>
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background },
  loading: { alignItems: 'center', gap: 16 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 28, borderRadius: theme.radius, backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1 },
  mark: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.navy },
  markText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  eyebrow: { marginTop: 20, marginBottom: 8, color: theme.colors.orange, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.colors.navy, fontSize: 27, fontWeight: '700' },
  copy: { marginTop: 10, marginBottom: 20, color: theme.colors.muted, fontSize: 16, lineHeight: 23 },
  fieldWrap: { marginTop: 12 },
  label: { marginBottom: 8, color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 54, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.text, fontSize: 16 },
  button: { minHeight: 56, marginTop: 22, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: theme.colors.orange },
  buttonPressed: { backgroundColor: theme.colors.orangeDark },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  linkButton: { minHeight: 52, marginTop: 8, justifyContent: 'center', alignItems: 'center' },
  linkText: { color: theme.colors.navyLight, fontSize: 15, fontWeight: '600' },
  error: { marginTop: 16, color: theme.colors.danger, fontSize: 14 },
  hint: { marginTop: 14, color: theme.colors.muted, fontSize: 13, lineHeight: 19 },
  sectionLabel: { marginTop: 22, marginBottom: 10, color: theme.colors.navy, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  loadingBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  memberRow: { marginTop: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  memberName: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  memberMeta: { marginTop: 3, color: theme.colors.muted, fontSize: 14 },
  gymName: { color: theme.colors.navyLight, fontSize: 18, fontWeight: '600' },
  role: { marginTop: 8, color: theme.colors.muted, fontSize: 14, textTransform: 'capitalize' },
})
