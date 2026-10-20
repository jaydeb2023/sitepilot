import Link from 'next/link'
import {
  ArrowRight, BarChart3, Building2, Check, ClipboardList, HardHat, Home, Landmark, Package, Paintbrush,
  Hammer, Sparkles, Users, Wallet, TrendingUp, Clock, ShieldCheck, Smartphone,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/Logo'

function Skyline() {
  return (
    <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full opacity-60" aria-hidden>
      <defs>
        <linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c1b3a" /><stop offset="1" stopColor="#14336b" /></linearGradient>
        <pattern id="hw" width="14" height="16" patternUnits="userSpaceOnUse"><rect x="3" y="4" width="7" height="8" fill="#60a5fa" opacity=".35" /></pattern>
      </defs>
      <rect width="800" height="420" fill="url(#hs)" />
      {[[430, 200, 90], [520, 140, 110], [630, 230, 80], [710, 120, 100], [350, 260, 70]].map(([x, h, w], i) => (
        <g key={i}><rect x={x} y={420 - h} width={w} height={h} fill="#1d3f82" opacity={0.75} /><rect x={x} y={420 - h} width={w} height={h} fill="url(#hw)" /></g>
      ))}
      <g stroke="#93c5fd" strokeWidth="3" fill="none" opacity=".7"><path d="M590 420V70M520 70h150M590 70l-48 34M590 70l40 30M650 70v50" /></g>
      <rect y="400" width="800" height="20" fill="#050c1c" opacity=".6" />
    </svg>
  )
}

function DeviceMock() {
  const bars = [30, 44, 38, 56, 48, 66, 74]
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="rounded-2xl border-[6px] border-slate-800 bg-slate-800 shadow-2xl">
        <div className="flex overflow-hidden rounded-lg bg-slate-50">
          <div className="w-14 bg-navy-900 p-2">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className={`mb-2 h-3 rounded ${i === 0 ? 'bg-brand-500' : 'bg-white/15'}`} />)}</div>
          <div className="flex-1 p-3">
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              {['8', '₹45 Cr', '₹28 Cr', '72%'].map(v => <div key={v} className="rounded bg-white p-1.5 text-center text-[10px] font-bold text-slate-700 shadow">{v}</div>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 rounded bg-white p-2 shadow">
                <div className="flex h-20 items-end gap-1.5">{bars.map((b, i) => <div key={i} className="flex-1 rounded-t bg-brand-500/80" style={{ height: `${b}%` }} />)}</div>
              </div>
              <div className="flex items-center justify-center rounded bg-white p-2 shadow">
                <div className="h-14 w-14 rounded-full border-[7px] border-emerald-400 border-r-red-400 border-t-brand-500" />
              </div>
            </div>
            <div className="mt-2 space-y-1">{[0, 1, 2].map(i => <div key={i} className="h-3 rounded bg-white shadow" />)}</div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -right-2 w-24 rounded-2xl border-4 border-slate-800 bg-slate-800 shadow-xl sm:w-28">
        <div className="rounded-lg bg-white p-2"><div className="mb-1.5 h-9 rounded bg-brand-600" /><div className="mb-1 h-3 rounded bg-slate-100" /><div className="grid grid-cols-2 gap-1"><div className="h-8 rounded bg-emerald-100" /><div className="h-8 rounded bg-amber-100" /></div></div>
      </div>
    </div>
  )
}

const FEATURES = [
  { Icon: Building2, t: 'Project Management', d: 'Plan projects, set milestones and track progress.', c: 'bg-blue-50 text-blue-600' },
  { Icon: ClipboardList, t: 'Daily Site Reports', d: 'Capture work progress with photos and updates.', c: 'bg-indigo-50 text-indigo-600' },
  { Icon: HardHat, t: 'Labour Management', d: 'Track attendance, wages and productivity.', c: 'bg-violet-50 text-violet-600' },
  { Icon: Package, t: 'Material & Inventory', d: 'Manage stock, requests and consumption.', c: 'bg-sky-50 text-sky-600' },
  { Icon: Users, t: 'Contractor Bills', d: 'Track bills, approvals and payments.', c: 'bg-blue-50 text-blue-600' },
  { Icon: Wallet, t: 'Expense & Budget', d: 'Monitor costs and budget utilisation.', c: 'bg-fuchsia-50 text-fuchsia-600' },
  { Icon: Sparkles, t: 'AI Site Assistant', d: 'Ask questions about your sites in plain language.', c: 'bg-cyan-50 text-cyan-600' },
  { Icon: BarChart3, t: 'Reports & Analytics', d: 'Detailed reports for better decisions.', c: 'bg-emerald-50 text-emerald-600' },
]

const PLANS = [
  { n: 'Starter', p: '₹4,999', d: 'For small contractors starting to digitise sites.', f: ['Up to 10 projects', '10 users', 'Daily reports with photos', 'Labour & materials', 'Basic reports'] },
  { n: 'Growth', p: '₹9,999', d: 'For builders running several sites at once.', f: ['Up to 30 projects', '40 users', 'Contractor bills & approvals', 'Budget & variance tracking', 'AI Site Assistant', 'Priority support'], hot: true },
  { n: 'Business', p: '₹19,999+', d: 'For larger companies needing customisation.', f: ['Unlimited projects', 'Unlimited users', 'Custom workflows & reports', 'Dedicated onboarding', 'Integrations on request'] },
]

export default function Landing() {
  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
            <a href="#top" className="text-white">Home</a><a href="#features" className="hover:text-white">Features</a>
            <a href="#solutions" className="hover:text-white">Solutions</a><a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#about" className="hover:text-white">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">Login</Link>
            <Link href="/demo" className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:block">Get a Free Demo</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-navy-900">
        <Skyline />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            <LogoMark size={16} /> Construction Management Made Simple
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Take Control of Every <span className="bg-gradient-to-r from-cyan-300 to-accent-500 bg-clip-text text-transparent">Construction Site</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">Manage projects, site reports, labour, materials, contractor bills and expenses — all in one platform.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-brand-500">Book a Free Demo <ArrowRight size={16} /></Link>
            <a href="#features" className="rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100">Explore Features</a>
          </div>
          <div className="mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[[TrendingUp, 'Track Progress in Real-Time'], [Wallet, 'Control Project Costs'], [Users, 'Improve Team Productivity'], [Clock, 'Complete Projects On Time']].map(([I, t]: any) => (
              <div key={t} className="flex items-center gap-2.5 text-xs font-medium text-slate-200"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><I size={16} /></span>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for */}
      <section id="solutions" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-xl font-bold text-slate-900">Built for Builders, Contractors and Construction Companies</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[[Home, 'Residential Projects'], [Building2, 'Commercial Buildings'], [Landmark, 'Infrastructure Projects'], [Paintbrush, 'Interior & Fit-out'], [Hammer, 'Renovation & Remodelling']].map(([I, t]: any) => (
            <div key={t} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-card"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><I size={20} /></span><span className="text-sm font-semibold text-slate-700">{t}</span></div>
          ))}
        </div>
      </section>

      {/* All in one */}
      <section className="bg-gradient-to-b from-brand-50/60 to-white py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <DeviceMock />
          <div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">All-in-one platform</span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">Plan. Execute. Monitor. <span className="text-brand-600">Deliver.</span></h2>
            <p className="mt-3 text-slate-600">From daily site reports to material tracking and contractor payments, SitePilot helps you run construction projects efficiently.</p>
            <ul className="mt-6 space-y-3">
              {['Real-time project progress', 'Labour attendance & wage tracking', 'Material inventory & purchase management', 'Contractor bills & expense control', 'Reports & AI insights'].map(t => (
                <li key={t} className="flex items-center gap-3 text-slate-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={14} /></span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">Powerful features</span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">Key Features</h2>
          <p className="mt-2 text-slate-500">Everything you need to manage construction projects from start to finish.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, t, d, c }) => (
            <div key={t} className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${c}`}><Icon size={22} /></span>
              <h3 className="mt-3 font-semibold text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center"><h2 className="text-3xl font-extrabold text-slate-900">How SitePilot Works</h2><p className="mt-2 text-slate-500">A simple and powerful workflow for your construction business.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[['Plan', 'Create projects, assign teams and set budgets.'], ['Execute', 'Track daily work, labour and materials on site.'], ['Monitor', 'Get real-time progress and cost updates.'], ['Deliver', 'Complete projects on time and within budget.']].map(([t, d], i) => (
              <div key={t} className="relative flex gap-3 rounded-2xl bg-white p-5 shadow-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
                <div><h3 className="font-semibold text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:grid-cols-3 sm:px-6">
        {[[ShieldCheck, 'Secure by design', 'Company-level data isolation, role-based access and a full audit trail.'], [Smartphone, 'Works on site', 'Responsive on phones and tablets so engineers can report from the field.'], [Wallet, 'Honest numbers', 'Estimates, committed costs and actual payments are always kept separate.']].map(([I, t, d]: any) => (
          <div key={t} className="flex gap-4 rounded-2xl border border-slate-100 p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><I size={22} /></span><div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div></div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center"><h2 className="text-3xl font-extrabold text-slate-900">Simple monthly pricing</h2><p className="mt-2 text-slate-500">Plus one-time onboarding & customisation from ₹30,000 depending on scope.</p></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLANS.map(p => (
              <div key={p.n} className={`rounded-2xl bg-white p-6 shadow-card ${p.hot ? 'ring-2 ring-brand-600' : 'border border-slate-100'}`}>
                {p.hot && <span className="mb-2 inline-block rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">Most popular</span>}
                <h3 className="text-lg font-bold">{p.n}</h3><p className="mt-1 text-sm text-slate-500">{p.d}</p>
                <div className="mt-4"><span className="text-3xl font-extrabold">{p.p}</span><span className="text-sm text-slate-500">/month</span></div>
                <ul className="mt-5 space-y-2 text-sm text-slate-600">{p.f.map(x => <li key={x} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />{x}</li>)}</ul>
                <Link href="/demo" className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold ${p.hot ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-200 hover:bg-slate-50'}`}>Get a Free Demo</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="relative overflow-hidden bg-navy-900">
        <Skyline />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 to-navy-900/60" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white">Ready to Transform Your <span className="text-cyan-300">Construction Business?</span></h2>
            <p className="mt-2 max-w-xl text-slate-300">Start a pilot with SitePilot and see every site, cost and team in one place.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-500">Book a Free Demo <ArrowRight size={16} /></Link>
            <Link href="/signup" className="rounded-lg bg-white px-6 py-3 font-semibold text-slate-900">Start Free Trial</Link>
          </div>
        </div>
      </section>

      <footer className="bg-navy-950 py-10 text-sm text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-6 px-4 sm:px-6">
          <div><Logo /><p className="mt-3 max-w-xs text-xs">A product of Evynta — AI, Web &amp; Data Solutions.</p></div>
          <div className="flex gap-12 text-xs"><div className="space-y-2"><div className="font-semibold text-white">Product</div><a href="#features" className="block">Features</a><a href="#pricing" className="block">Pricing</a></div>
            <div className="space-y-2"><div className="font-semibold text-white">Account</div><Link href="/login" className="block">Login</Link><Link href="/signup" className="block">Sign up</Link><Link href="/demo" className="block">Book a demo</Link></div></div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl px-4 text-xs sm:px-6">© {new Date().getFullYear()} SitePilot by Evynta. All rights reserved.</p>
      </footer>
    </div>
  )
}
