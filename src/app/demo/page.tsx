'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Btn, inputCls, Label } from '@/components/ui'

export default function DemoPage() {
  const [f, setF] = useState({ name: '', company: '', phone: '', email: '', active_projects: '', message: '' })
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState('busy'); setErr('')
    const { error } = await createClient().from('demo_requests').insert(f)
    if (error) { setErr('Could not send your request. Please try again.'); setState('idle') } else setState('done')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
        <Link href="/"><Logo dark /></Link>
        {state === 'done' ? (
          <div className="py-10 text-center">
            <h1 className="text-xl font-bold text-slate-900">Thank you!</h1>
            <p className="mt-2 text-sm text-slate-500">The Evynta team will contact you shortly to schedule your demo.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand-600">Back to home</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="mt-6 text-xl font-bold text-slate-900">Book a free demo</h1>
            <p className="mb-5 text-sm text-slate-500">Tell us about your sites and we&apos;ll show how SitePilot fits.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Name *</Label><input className={inputCls} required value={f.name} onChange={e => set('name', e.target.value)} /></div>
              <div><Label>Company</Label><input className={inputCls} value={f.company} onChange={e => set('company', e.target.value)} /></div>
              <div><Label>Phone / WhatsApp</Label><input className={inputCls} value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><Label>Email</Label><input className={inputCls} type="email" value={f.email} onChange={e => set('email', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>How many active sites?</Label>
                <select className={inputCls} value={f.active_projects} onChange={e => set('active_projects', e.target.value)}>
                  <option value="">Select</option><option>1–2</option><option>3–5</option><option>6–10</option><option>10+</option>
                </select></div>
              <div className="sm:col-span-2"><Label>What do you want to fix first?</Label><textarea className={inputCls} rows={3} value={f.message} onChange={e => set('message', e.target.value)} /></div>
              {err && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
              <Btn type="submit" loading={state === 'busy'} className="sm:col-span-2">Request demo</Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
