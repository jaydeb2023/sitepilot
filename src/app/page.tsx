import Link from 'next/link'
import {
  ArrowRight, BarChart3, Building2, Check, ClipboardList, HardHat, Home, Landmark, Package, Paintbrush,
  Hammer, Sparkles, Users, Wallet, TrendingUp, Clock, ShieldCheck, Smartphone, ChevronDown,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/Logo'
import Pricing from '@/components/Pricing'

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
            <a href="#features" className="inline-flex items-center gap-1 hover:text-white">Resources <ChevronDown size={14} /></a>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="Site engineer checking project progress on a tablet at a construction site" width={844} height={704} fetchPriority="high"
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-[78%_center] opacity-35 lg:w-[66%] lg:opacity-100"
          style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,.35) 14%, rgba(0,0,0,.8) 34%, #000 55%)', maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,.35) 14%, rgba(0,0,0,.8) 34%, #000 55%)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900/70 via-navy-900/40 to-transparent lg:from-navy-900/85 lg:via-navy-900/20" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-navy-900/80 to-transparent" />
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
          <div className="relative">
            <div className="absolute inset-x-6 bottom-2 top-10 rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/devices.jpg" alt="SitePilot dashboard on laptop, tablet and phone" width={952} height={612} loading="lazy"
              className="relative mx-auto w-full max-w-[560px] mix-blend-multiply" />
          </div>
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
                {i < 3 && <ArrowRight size={18} className="absolute -right-[18px] top-1/2 z-10 hidden -translate-y-1/2 text-brand-400 md:block" />}
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
          <div className="mb-10 text-center">
            <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">Simple pricing</span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">Pick the plan that fits your sites</h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-500">Start with a 14-day free trial of any plan. Upgrade, downgrade or talk to us whenever your business grows.</p>
          </div>
          <Pricing mode="public" />
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="relative overflow-hidden bg-navy-900">
        <Skyline />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-25 md:w-1/2 md:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/85 to-navy-900/30" />
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

      <footer className="bg-navy-950 py-12 text-sm text-slate-400">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div><Logo /><p className="mt-3 max-w-xs text-xs leading-relaxed">A product of Evynta — AI, Web &amp; Data Solutions. Built for Indian builders and contractors.</p></div>
          <div className="space-y-2 text-xs"><div className="font-semibold text-white">Product</div><a href="#features" className="block hover:text-white">Features</a><a href="#pricing" className="block hover:text-white">Pricing</a><a href="#solutions" className="block hover:text-white">Solutions</a></div>
          <div className="space-y-2 text-xs"><div className="font-semibold text-white">Company</div><a href="#about" className="block hover:text-white">About</a><Link href="/demo" className="block hover:text-white">Contact</Link><Link href="/demo" className="block hover:text-white">Book a demo</Link></div>
          <div className="space-y-2 text-xs"><div className="font-semibold text-white">Account</div><Link href="/login" className="block hover:text-white">Login</Link><Link href="/signup" className="block hover:text-white">Start free trial</Link></div>
        </div>
        <p className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-6 text-xs sm:px-6">© {new Date().getFullYear()} SitePilot by Evynta. All rights reserved.</p>
      </footer>
    </div>
  )
}
