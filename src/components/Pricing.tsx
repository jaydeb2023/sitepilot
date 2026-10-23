'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { Check, Minus } from 'lucide-react'
import { COMPARISON, PlanDef, PLANS, Plan, SETUP_NOTE } from '@/lib/plans'

type Props = { mode: 'public' | 'app'; current?: Plan; cta?: (p: PlanDef) => ReactNode }

function Cell({ v }: { v: boolean | string }) {
  if (typeof v === 'string') return <span className="font-semibold text-slate-800">{v}</span>
  return v ? <Check size={18} className="mx-auto text-emerald-500" aria-label="Included" /> : <Minus size={16} className="mx-auto text-slate-300" aria-label="Not included" />
}

export default function Pricing({ mode, current, cta }: Props) {
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map(p => (
          <div key={p.id} className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-card ${p.popular ? 'ring-2 ring-brand-600' : 'border border-slate-100'} ${current === p.id ? 'outline outline-2 outline-offset-2 outline-emerald-500' : ''}`}>
            {p.popular && <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Most popular</span>}
            {current === p.id && <span className="absolute -top-3 right-6 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Your plan</span>}
            <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
            <p className="mt-1 min-h-[2.5rem] text-sm text-slate-500">{p.tagline}</p>
            <div className="mt-3"><span className="text-4xl font-extrabold text-slate-900">{p.price}</span><span className="text-sm text-slate-500">{p.suffix}</span></div>
            <p className="mt-1 text-xs font-medium text-slate-500">{p.projects ? `${p.projects} projects` : 'Unlimited projects'} · {p.users ? `${p.users} users` : 'Unlimited users'}</p>
            <div className="mt-5">
              {mode === 'public' ? (
                <div className="space-y-2">
                  <Link href={p.id === 'business' ? '/demo?plan=business' : `/signup?plan=${p.id}`}
                    className={`block rounded-lg py-2.5 text-center text-sm font-semibold ${p.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
                    {p.id === 'business' ? 'Talk to us' : 'Start 14-day free trial'}
                  </Link>
                  <p className="text-center text-[11px] text-slate-400">{p.id === 'business' ? 'Or start a trial at /signup' : 'No card required'}</p>
                </div>
              ) : cta?.(p)}
            </div>
            <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-600">
              {p.lead && <li className="font-semibold text-slate-800">{p.lead}</li>}
              {p.features.map(f => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">{SETUP_NOTE}</p>

      <h3 className="mb-3 mt-12 text-center text-xl font-bold text-slate-900">Compare plans in detail</h3>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-card">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Features</th>
              {PLANS.map(p => <th key={p.id} className={`w-32 px-3 py-3 text-center ${p.popular ? 'text-brand-700' : 'text-slate-800'}`}><div className="font-bold">{p.name}</div><div className="text-xs font-medium text-slate-500">{p.price}/mo</div></th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map(g => (
              <>
                <tr key={g.group} className="bg-slate-50/60"><td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{g.group}</td></tr>
                {g.rows.map(r => (
                  <tr key={g.group + r.label} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{r.label}</td>
                    {r.values.map((v, i) => <td key={i} className="px-3 py-2.5 text-center"><Cell v={v} /></td>)}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
