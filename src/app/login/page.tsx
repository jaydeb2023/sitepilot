'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Btn, inputCls, Label } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { createClient().auth.getUser().then(({ data }: any) => { if (data?.user) window.location.href = '/app' }) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setErr(error.message); setBusy(false); return }
    const next = new URLSearchParams(window.location.search).get('next')
    window.location.href = next && next.startsWith('/app') ? next : '/app'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <Link href="/"><Logo dark /></Link>
        <h1 className="mt-6 text-xl font-bold text-slate-900">Welcome back</h1>
        <p className="mb-5 text-sm text-slate-500">Sign in to your SitePilot workspace.</p>
        <div className="space-y-3">
          <div><Label>Email</Label><input className={inputCls} type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><Label>Password</Label><input className={inputCls} type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          <Btn type="submit" loading={busy} className="w-full">Sign in</Btn>
        </div>
        <p className="mt-5 text-center text-sm text-slate-500">New to SitePilot? <Link href="/signup" className="font-semibold text-brand-600">Create a workspace</Link></p>
      </form>
    </div>
  )
}
