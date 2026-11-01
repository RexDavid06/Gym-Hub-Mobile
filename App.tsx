import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { apiFetch, buildApiPath } from './src/api/client'
import type { components } from './src/api/schema'
import { AuthProvider, useAuth } from './src/auth/AuthContext'
import { MemberMembershipSection } from './src/membership/MemberMembershipSection'
import { theme } from './src/theme'

type Profile = components['schemas']['Me']
type TrainerMember = components['schemas']['UserList']
type MemberTrainer = components['schemas']['MemberTrainer']
type WorkoutPlan = components['schemas']['WorkoutPlan']
type PlanStatus = NonNullable<WorkoutPlan['status']>
type ExerciseDraft = { name: string; sets: string; reps: string; weight: string }

const blankExercise = (): ExerciseDraft => ({ name: '', sets: '3', reps: '10', weight: '' })

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
  const [selectedMember, setSelectedMember] = useState<TrainerMember | null>(null)
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

  if (selectedMember) {
    return (
      <TrainerMemberPlans
        member={selectedMember}
        onBack={() => setSelectedMember(null)}
        onLogout={onLogout}
      />
    )
  }

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
          <Pressable
            key={member.id}
            accessibilityRole="button"
            onPress={() => setSelectedMember(member)}
            style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowPressed]}
          >
            <View>
              <Text style={styles.memberName}>{member.name || 'Unnamed member'}</Text>
              <Text style={styles.memberMeta}>{member.phone}</Text>
            </View>
            <Text style={styles.memberChevron}>View plans ›</Text>
          </Pressable>
        ))}
        <ActionButton label="Log out" onPress={() => void onLogout()} />
      </Card>
    </Screen>
  )
}

function TrainerMemberPlans({
  member,
  onBack,
  onLogout,
}: {
  member: TrainerMember
  onBack: () => void
  onLogout: () => Promise<void>
}) {
  const [plans, setPlans] = useState<WorkoutPlan[] | null>(null)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkoutPlan | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setPlans(null)
    setError('')
    try {
      const rows = await apiFetch<WorkoutPlan[]>('/api/workout-plans/', 'get')
      setPlans(rows.filter((plan) => plan.member.id === member.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load workout plans.')
    }
  }, [member.id])

  useEffect(() => {
    void load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
    setError('')
  }

  const openEdit = (plan: WorkoutPlan) => {
    setEditing(plan)
    setFormOpen(true)
    setError('')
  }

  const saved = (plan: WorkoutPlan) => {
    setPlans((current) => {
      const rows = current ?? []
      return rows.some((row) => row.id === plan.id)
        ? rows.map((row) => (row.id === plan.id ? plan : row))
        : [plan, ...rows]
    })
    setFormOpen(false)
    setEditing(null)
  }

  const remove = async (plan: WorkoutPlan) => {
    setDeletingId(plan.id)
    setError('')
    try {
      await apiFetch<void>(buildApiPath('/api/workout-plans/{id}/', { id: plan.id }), 'delete')
      setPlans((current) => current?.filter((row) => row.id !== plan.id) ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete this plan.')
    } finally {
      setDeletingId(null)
    }
  }

  const confirmDelete = (plan: WorkoutPlan) => {
    Alert.alert('Delete workout plan', `Delete "${plan.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(plan) },
    ])
  }

  return (
    <Screen>
      <Card>
        <Brand />
        <Text style={styles.title}>{member.name || 'Member'}</Text>
        <Text style={styles.copy}>{member.phone}</Text>
        <LinkButton label="‹ Back to assigned members" onPress={onBack} />
        <Text style={styles.sectionLabel}>Workout plans</Text>
        {plans === null && !error ? <LoadingBlock label="Loading workout plans…" /> : null}
        {error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <ActionButton label="Try again" onPress={() => void load()} />
          </>
        ) : null}
        {plans !== null && plans.length === 0 ? (
          <Text style={styles.hint}>No workout plans yet for this member.</Text>
        ) : null}
        {plans?.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => openEdit(plan)}
            onDelete={() => confirmDelete(plan)}
            deleting={deletingId === plan.id}
          />
        ))}
        {!formOpen ? <ActionButton label="New workout plan" onPress={openNew} /> : null}
        {formOpen ? (
          <WorkoutPlanForm
            memberId={member.id}
            plan={editing}
            onCancel={() => {
              setFormOpen(false)
              setEditing(null)
            }}
            onSaved={saved}
          />
        ) : null}
        <ActionButton label="Log out" onPress={() => void onLogout()} />
      </Card>
    </Screen>
  )
}

function WorkoutPlanForm({
  memberId,
  plan,
  onCancel,
  onSaved,
}: {
  memberId: number
  plan: WorkoutPlan | null
  onCancel: () => void
  onSaved: (plan: WorkoutPlan) => void
}) {
  const [title, setTitle] = useState(plan?.title ?? '')
  const [notes, setNotes] = useState(plan?.notes ?? '')
  const [status, setStatus] = useState<PlanStatus>(plan?.status ?? 'active')
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    plan?.exercises?.length
      ? plan.exercises.map((exercise) => ({
          name: exercise.name,
          sets: String(exercise.sets ?? ''),
          reps: exercise.reps ?? '',
          weight: exercise.weight ?? '',
        }))
      : [blankExercise()],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateExercise = (index: number, patch: Partial<ExerciseDraft>) => {
    setExercises((current) =>
      current.map((exercise, position) =>
        position === index ? { ...exercise, ...patch } : exercise,
      ),
    )
  }

  const submit = async () => {
    if (!title.trim()) {
      setError('Enter a plan title.')
      return
    }
    const rows = exercises
      .map((exercise, index) => ({
        name: exercise.name.trim(),
        sets: Number(exercise.sets) || 0,
        reps: exercise.reps.trim() || '10',
        weight: exercise.weight.trim(),
        order: index + 1,
      }))
      .filter((exercise) => exercise.name)
    if (rows.length === 0) {
      setError('Add at least one exercise.')
      return
    }
    const payload = {
      member_id: memberId,
      title: title.trim(),
      notes: notes.trim(),
      status,
      exercises: rows,
    }
    setSaving(true)
    setError('')
    try {
      const result = plan
        ? await apiFetch<WorkoutPlan>(
            buildApiPath('/api/workout-plans/{id}/', { id: plan.id }),
            'put',
            payload,
          )
        : await apiFetch<WorkoutPlan>('/api/workout-plans/', 'post', payload)
      onSaved(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.formBox}>
      <Text style={styles.formTitle}>{plan ? 'Edit workout plan' : 'New workout plan'}</Text>
      <Field label="Plan title" value={title} onChangeText={setTitle} placeholder="e.g. Strength — Week 1" />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional instructions for the member"
        multiline
      />
      <Text style={styles.label}>Status</Text>
      <View style={styles.statusRow}>
        {(['draft', 'active', 'archived'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            onPress={() => setStatus(value)}
            style={[styles.statusChip, status === value && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, status === value && styles.statusChipTextActive]}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Exercises</Text>
      {exercises.map((exercise, index) => (
        <View key={index} style={styles.exerciseEditor}>
          <Field
            label={`Exercise ${index + 1}`}
            value={exercise.name}
            onChangeText={(value) => updateExercise(index, { name: value })}
            placeholder="Exercise name"
          />
          <View style={styles.inlineRow}>
            <View style={styles.inlineField}>
              <Field
                label="Sets"
                value={exercise.sets}
                onChangeText={(value) => updateExercise(index, { sets: value })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inlineField}>
              <Field
                label="Reps"
                value={exercise.reps}
                onChangeText={(value) => updateExercise(index, { reps: value })}
                placeholder="10"
              />
            </View>
            <View style={styles.inlineField}>
              <Field
                label="Weight"
                value={exercise.weight}
                onChangeText={(value) => updateExercise(index, { weight: value })}
                placeholder="kg"
              />
            </View>
          </View>
          {exercises.length > 1 ? (
            <LinkButton
              label="Remove exercise"
              onPress={() =>
                setExercises((current) => current.filter((_, position) => position !== index))
              }
            />
          ) : null}
        </View>
      ))}
      <LinkButton
        label="+ Add exercise"
        onPress={() => setExercises((current) => [...current, blankExercise()])}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <ActionButton
        label={plan ? 'Save changes' : 'Create plan'}
        busy={saving}
        onPress={() => void submit()}
      />
      <LinkButton label="Cancel" onPress={onCancel} />
    </View>
  )
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
  deleting = false,
}: {
  plan: WorkoutPlan
  onEdit?: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  const status = plan.status ?? 'draft'
  const exercises = plan.exercises ?? []
  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <View style={[styles.statusPill, status === 'active' && styles.statusPillActive]}>
          <Text style={[styles.statusPillText, status === 'active' && styles.statusPillTextActive]}>
            {status}
          </Text>
        </View>
      </View>
      {plan.notes ? <Text style={styles.planNotes}>{plan.notes}</Text> : null}
      {exercises.map((exercise, index) => (
        <View key={exercise.id ?? index} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.sets ? `${exercise.sets} sets` : ''}
            {exercise.reps ? ` × ${exercise.reps}` : ''}
            {exercise.weight ? ` · ${exercise.weight}` : ''}
          </Text>
        </View>
      ))}
      {onEdit || onDelete ? (
        <View style={styles.planActions}>
          {onEdit ? (
            <Pressable accessibilityRole="button" onPress={onEdit} style={styles.actionLink}>
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              disabled={deleting}
              onPress={onDelete}
              style={styles.actionLink}
            >
              <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function MemberHome({ profile, onLogout }: { profile: Profile; onLogout: () => Promise<void> }) {
  const [assignment, setAssignment] = useState<MemberTrainer | null>(null)
  const [plans, setPlans] = useState<WorkoutPlan[] | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoaded(false)
    setError('')
    try {
      const [trainer, planRows] = await Promise.all([
        apiFetch<MemberTrainer>('/api/me/trainer/', 'get'),
        apiFetch<WorkoutPlan[]>('/api/workout-plans/', 'get'),
      ])
      setAssignment(trainer)
      setPlans(planRows)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your home screen.')
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
        {!loaded && !error ? <LoadingBlock label="Loading your home screen…" /> : null}
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
        <MemberMembershipSection />
        <Text style={styles.sectionLabel}>Your workout plans</Text>
        {loaded && !error && plans?.length === 0 ? (
          <Text style={styles.hint}>No workout plans yet. Your trainer will add one soon.</Text>
        ) : null}
        {plans?.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
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
  memberRow: { marginTop: 8, minHeight: 64, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  memberRowPressed: { borderColor: theme.colors.orange, backgroundColor: '#FFF7F1' },
  memberName: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  memberMeta: { marginTop: 3, color: theme.colors.muted, fontSize: 14 },
  memberChevron: { color: theme.colors.navyLight, fontSize: 14, fontWeight: '600' },
  gymName: { color: theme.colors.navyLight, fontSize: 18, fontWeight: '600' },
  role: { marginTop: 8, color: theme.colors.muted, fontSize: 14, textTransform: 'capitalize' },
  planCard: { marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planTitle: { flex: 1, color: theme.colors.navy, fontSize: 18, fontWeight: '700' },
  planNotes: { marginTop: 8, color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#E2E8F0' },
  statusPillActive: { backgroundColor: '#DCFCE7' },
  statusPillText: { color: theme.colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  statusPillTextActive: { color: theme.colors.success },
  exerciseRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  exerciseName: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  exerciseMeta: { marginTop: 2, color: theme.colors.muted, fontSize: 13 },
  planActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 12 },
  actionLink: { minHeight: 44, justifyContent: 'center' },
  actionText: { color: theme.colors.navyLight, fontSize: 14, fontWeight: '600' },
  deleteText: { color: theme.colors.danger, fontSize: 14, fontWeight: '600' },
  formBox: { marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  formTitle: { color: theme.colors.navy, fontSize: 18, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusChip: { flex: 1, minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  statusChipActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  statusChipText: { color: theme.colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  statusChipTextActive: { color: theme.colors.white },
  exerciseEditor: { marginTop: 14, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.border },
  inlineRow: { flexDirection: 'row', gap: 10 },
  inlineField: { flex: 1 },
})
