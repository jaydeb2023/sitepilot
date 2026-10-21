'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/permissions'
import { Btn, Spinner } from './ui'

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
  const value: Ctx = {
    sb, user: state.user, profile: state.profile, company: state.profile.company, subscription: state.subscription,
    role, companyId: state.profile.company_id, refresh: load, can: roles => roles.includes(role),
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
