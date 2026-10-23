'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Btn, inputCls, Label } from '@/components/ui'
import GoogleButton from '@/components/GoogleButton'
import { PLANS } from '@/lib/plans'

export default function SignupPage() {
  const [f, setF] = useState({ full_name: '', company_name: '', email: '', password: '' })
  const [plan, setPlan] = useState('growth')
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('plan'); if (q && PLANS.some(p => p.id === q)) setPlan(q) }, [])
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }))

  useEffect(() => { createClient().auth.getUser().then(({ data }: any) => { if (data?.user) window.location.href = '/app' }) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    if (f.password.length < 8) { setErr('Password must be at least 8 characters'); setBusy(false); return }
    const { data, error } = await createClient().auth.signUp({
      email: f.email, password: f.password,
      options: { data: { full_name: f.full_name, company_name: f.company_name, plan }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setErr(error.message); setBusy(false); return }
    if (data.session) window.location.href = '/app'
    else { setDone(true); setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <Link href="/"><Logo dark full height={72} /></Link>
        {done ? (
          <div className="py-8 text-center">
            <h1 className="text-lg font-bold text-slate-900">Check your email</h1>
            <p className="mt-2 text-sm text-slate-500">We sent a confirmation link to <b>{f.email}</b>. Open it to activate your workspace.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="mt-6 text-xl font-bold text-slate-900">Create your workspace</h1>
            <p className="mb-4 text-sm text-slate-500">14-day free trial, no card required. You become the Business Owner.</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {PLANS.map(p => (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                  className={`rounded-lg border px-2 py-2 text-center transition ${plan === p.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="text-sm font-bold text-slate-900">{p.name}</div><div className="text-[11px] text-slate-500">{p.price}/mo</div>
                </button>))}
            </div>
            <GoogleButton plan={plan} label="Sign up with Google" />
            <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>
            <div className="space-y-3">
              <div><Label>Your name</Label><input className={inputCls} required value={f.full_name} onChange={e => set('full_name', e.target.value)} /></div>
              <div><Label>Company name</Label><input className={inputCls} required value={f.company_name} onChange={e => set('company_name', e.target.value)} /></div>
              <div><Label>Work email</Label><input className={inputCls} type="email" required value={f.email} onChange={e => set('email', e.target.value)} /></div>
              <div><Label>Password</Label><input className={inputCls} type="password" required value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" /></div>
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
              <Btn type="submit" loading={busy} className="w-full">Create workspace</Btn>
            </div>
            <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}
