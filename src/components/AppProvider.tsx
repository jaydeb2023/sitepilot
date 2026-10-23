'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Role } from '@/lib/permissions'
import { Feature, Plan, PLAN_ORDER, planAllows } from '@/lib/plans'
import { friendly } from '@/lib/friendly'
import { Btn, Spinner } from './ui'
import { prefetchAll } from '@/lib/prefetch'

// Plain-language database errors everywhere toast.error is used
if (typeof window !== 'undefined' && !(toast as any).__friendly) {
  const orig = toast.error.bind(toast)
  ;(toast as any).error = (m: any, ...rest: any[]) => orig(typeof m === 'string' ? friendly(m) : m, ...rest)
  ;(toast as any).__friendly = true
}

type Ctx = {
  sb: any
  user: any
  profile: any
  company: { id: string; name: string }
  subscription: any
  role: Role
  companyId: string
  refresh: () => Promise<void>
  can: (roles: Role[]) => boolean
  plan: Plan
  allows: (f: Feature) => boolean   // does the PLAN include this feature (used for UI gating)
  subActive: boolean                // false once a trial / paid period has ended (workspace is read-only)
  daysLeft: number | null
}
const AppCtx = createContext<Ctx | null>(null)

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp must be used inside <AppProvider>')
  return c
}

export default function AppProvider({ children }: { children: ReactNode }) {
  const sb = useMemo(() => (typeof window === 'undefined' ? null : createClient()), [])
  const [state, setState] = useState<{ user: any; profile: any; subscription: any } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sb) return
    const { data: { session } } = await sb.auth.getSession()   // local read, no network round trip
    const user = session?.user
    if (!user) { window.location.href = '/login'; return }
    const [{ data: profile, error: pe }, { data: subscription }] = await Promise.all([
      sb.from('profiles').select('*, company:companies(id,name)').eq('id', user.id).maybeSingle(),
      sb.from('subscriptions').select('*').maybeSingle(),
    ])
    if (pe && /jwt|token|auth/i.test(pe.message || '')) { window.location.href = '/login'; return }
    if (pe || !profile || !profile.active) { setError(pe?.message || 'Your account is not linked to an active workspace. Please contact your administrator.'); return }
    setState({ user, profile, subscription })
  }, [sb])

  useEffect(() => { load() }, [load])

  // Google sign-up: apply the plan picked on the pricing section (email sign-up passes it in the user metadata instead)
  useEffect(() => {
    if (!sb || !state) return
    const want = localStorage.getItem('sp_plan')
    if (!want) return
    localStorage.removeItem('sp_plan')
    const s = state.subscription
    if (state.profile.role === 'owner' && s?.status === 'trialing' && s.plan !== want && PLAN_ORDER.includes(want as Plan)) {
      sb.rpc('choose_trial_plan', { p_plan: want }).then(() => load())
    }
  }, [sb, state?.user?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  // Warm the cache for every page this user can open, so later clicks render instantly
  useEffect(() => {
    if (!sb || !state) return
    const t = setTimeout(() => { prefetchAll(sb, state.profile.role, f => planAllows((state.subscription?.plan || 'starter') as Plan, f)) }, 150)
    return () => clearTimeout(t)
  }, [sb, state])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-slate-600">{error}</p>
        <Btn variant="secondary" onClick={async () => { await sb.auth.signOut(); window.location.href = '/login' }}>Sign out</Btn>
      </div>
    )
  }
  if (!sb || !state) return <div className="min-h-screen"><Spinner label="Loading your workspace…" /></div>

  const role = state.profile.role as Role
  const sub = state.subscription
  const plan = (PLAN_ORDER.includes(sub?.plan) ? sub.plan : 'starter') as Plan
  const endMs = sub ? new Date((sub.status === 'trialing' ? sub.trial_ends_at : sub.current_period_end) || 0).getTime() || null : null
  const subActive = !!sub && (sub.status === 'trialing' ? !!endMs && endMs > Date.now() : sub.status === 'active' ? !endMs || endMs > Date.now() : false)
  const daysLeft = endMs ? Math.ceil((endMs - Date.now()) / 86400000) : null
  const value: Ctx = {
    plan, allows: f => planAllows(plan, f), subActive, daysLeft,
    sb, user: state.user, profile: state.profile, company: state.profile.company, subscription: state.subscription,
    role, companyId: state.profile.company_id, refresh: load, can: roles => roles.includes(role),
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
