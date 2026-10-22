'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Btn, inputCls, Label } from '@/components/ui'

export default function SignupPage() {
  const [f, setF] = useState({ full_name: '', company_name: '', email: '', password: '' })
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
      options: { data: { full_name: f.full_name, company_name: f.company_name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
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
            <p className="mb-5 text-sm text-slate-500">14-day trial. You become the Business Owner.</p>
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
