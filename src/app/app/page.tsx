'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Building2, IndianRupee, Wallet, FileCheck2, PackageSearch, Users, AlertTriangle } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '@/components/AppProvider'
import { inputAuto, Btn, Card, CardTitle, Empty, inputCls, PageHeader, Spinner, StatTile, StatusBadge, Tabs } from '@/components/ui'
import ProjectArt from '@/components/ProjectArt'
import { crShort, daysBetween, fmtDate, inr, todayISO } from '@/lib/format'
import { FINANCE, MANAGERS } from '@/lib/permissions'
import { store } from '@/lib/store'
import { fetchOverview } from '@/lib/prefetch'

const STATUS_COLORS: Record<string, string> = { on_track: '#2250e8', delayed: '#ef4444', at_risk: '#f59e0b', completed: '#22c55e', planning: '#94a3b8' }
const STATUS_LABEL: Record<string, string> = { on_track: 'On Track', delayed: 'Delayed', at_risk: 'At Risk', completed: 'Completed', planning: 'Planning' }

export default function Overview() {
  const { sb, role, can, profile, allows } = useApp()
  const [loading, setLoading] = useState(!store.has('overview'))
  const [data, setData] = useState<any>(store.get('overview') ?? null)
  const [project, setProject] = useState('')
  const yearStart = `${new Date().getFullYear()}-01-01`
  const [from, setFrom] = useState(yearStart)
  const [to, setTo] = useState(todayISO())
  const [tab, setTab] = useState<'requests' | 'bills' | 'expenses'>('requests')

  const load = useCallback(async () => {
    const next = await fetchOverview(sb)
    store.set('overview', next)
    setData(next)
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const view = useMemo(() => {
    if (!data) return null
    const ps = data.projects.filter((p: any) => !project || p.id === project)
    const ids = new Set(ps.map((p: any) => p.id))
    const inP = (r: any) => ids.has(r.project_id)
    const activeProjects = ps.filter((p: any) => p.status !== 'completed').length
    const totalValue = ps.reduce((s: number, p: any) => s + Number(p.contract_value), 0)
    const revisionSum = data.revisions.filter(inP).reduce((s: number, r: any) => s + Number(r.change_amount), 0)
    const budget = ps.reduce((s: number, p: any) => s + Number(p.approved_budget), 0) + revisionSum
    const allActual = data.expenses.filter(inP).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const periodActual = data.expenses.filter(inP).filter((e: any) => e.expense_date >= from && e.expense_date <= to).reduce((s: number, e: any) => s + Number(e.amount), 0)
    const util = budget > 0 ? Math.round((allActual / budget) * 100) : 0

    // Monthly cumulative: planned spend (budget spread over each project's timeline) vs recorded actual
    const months: { label: string; end: string }[] = []
    const cur = new Date(from + 'T00:00:00'); cur.setDate(1)
    const last = new Date(to + 'T00:00:00')
    while (cur <= last && months.length < 24) {
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      months.push({ label: cur.toLocaleDateString('en-IN', { month: 'short' }), end: (end > last ? last : end).toISOString().slice(0, 10) })
      cur.setMonth(cur.getMonth() + 1)
    }
    const chart = months.map(m => {
      const planned = ps.reduce((s: number, p: any) => {
        if (!p.start_date || !p.target_date) return s
        const span = Math.max(1, daysBetween(p.start_date, p.target_date))
        const frac = Math.min(1, Math.max(0, daysBetween(p.start_date, m.end) / span))
        return s + Number(p.approved_budget) * frac
      }, 0)
      const actual = data.expenses.filter(inP).filter((e: any) => e.expense_date <= m.end).reduce((s: number, e: any) => s + Number(e.amount), 0)
      return { month: m.label, Budget: Math.round(planned), Actual: Math.round(actual) }
    })

    const statusCount: Record<string, number> = {}
    ps.forEach((p: any) => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })
    const donut = Object.entries(statusCount).map(([k, v]) => ({ key: k, name: STATUS_LABEL[k], value: v }))

    return {
      ps, activeProjects, totalValue, periodActual, util, chart, donut,
      requests: data.requests.filter(inP), bills: data.bills.filter(inP), pendExp: data.pendExp.filter(inP),
      overdue: data.overdue.filter(inP).length,
      present: data.attendance.filter((a: any) => a.status !== 'absent').length,
      committed: data.pos.filter(inP).filter((o: any) => o.delivery_status !== 'cancelled').reduce((s: number, o: any) => s + (Number(o.amount) - Number(o.paid_amount)), 0),
    }
  }, [data, project, from, to])

  const decide = async (table: string, id: string, patch: any, ok: string) => {
    const { error } = await sb.from(table).update(patch).eq('id', id)
    if (error) toast.error(error.message); else { toast.success(ok); load() }
  }

  if (loading || !view) return <Spinner />
  const canApprove = can(MANAGERS)
  const canApproveExpense = can(FINANCE)
  const ytd = from === yearStart && to === todayISO()

  return (
    <div>
      <PageHeader title={`Welcome back, ${(profile.full_name || '').split(' ')[0]}`} subtitle="Here's what's happening across your sites."
        actions={<>
          <select value={project} onChange={e => setProject(e.target.value)} className={inputAuto + ' w-auto'}>
            <option value="">All Projects</option>
            {data.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputAuto + ' w-auto'} aria-label="From" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputAuto + ' w-auto'} aria-label="To" />
        </>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile icon={<Building2 size={22} />} value={view.activeProjects} label="Active Projects" />
        <StatTile icon={<IndianRupee size={22} />} tone="green" value={crShort(view.totalValue)} label="Total Project Value" />
        <StatTile icon={<Wallet size={22} />} tone="red" value={crShort(view.periodActual)} label={ytd ? 'Expenses (YTD)' : 'Expenses (period)'} sub="Recorded & approved" />
        <Card className="flex items-center gap-3 p-4">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" strokeLinecap="round" stroke={view.util > 100 ? '#ef4444' : view.util > 90 ? '#f59e0b' : '#22c55e'}
                strokeDasharray={`${Math.min(100, view.util) * 0.974} 97.4`} />
            </svg>
          </div>
          <div><div className="text-xl font-bold text-slate-900">{view.util}%</div><div className="text-xs text-slate-500">Budget Utilization</div></div>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/app/materials"><StatTile icon={<PackageSearch size={20} />} tone="amber" value={view.requests.length} label="Pending material requests" /></Link>
        {allows('contractor_bills')
          ? <Link href="/app/contractors"><StatTile icon={<FileCheck2 size={20} />} tone="purple" value={view.bills.length} label="Pending contractor bills" /></Link>
          : <Link href="/app/expenses"><StatTile icon={<FileCheck2 size={20} />} tone="purple" value={view.pendExp.length} label="Expenses awaiting approval" /></Link>}
        <Link href="/app/labour"><StatTile icon={<Users size={20} />} tone="green" value={view.present} label="Workers present today" /></Link>
        <Link href="/app/tasks"><StatTile icon={<AlertTriangle size={20} />} tone="red" value={view.overdue} label="Overdue tasks" /></Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <CardTitle>Project Expenses vs Budget <span className="text-xs font-normal text-slate-400">(cumulative, planned vs recorded)</span></CardTitle>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={view.chart} margin={{ left: -8, right: 8, top: 8 }}>
                <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c55e" stopOpacity={0.35} /><stop offset="1" stopColor="#22c55e" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => crShort(v)} width={64} />
                <Tooltip formatter={(v: any) => inr(Number(v))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Budget" stroke="#2250e8" strokeWidth={2} fill="none" />
                <Area type="monotone" dataKey="Actual" name="Actual Expense" stroke="#22c55e" strokeWidth={2} fill="url(#ga)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <CardTitle>Project Status</CardTitle>
          {view.donut.length === 0 ? <Empty title="No projects yet" /> : (
            <div className="flex items-center gap-2">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer><PieChart><Pie data={view.donut} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                  {view.donut.map((d: any) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold">{view.ps.length}</span><span className="text-[11px] text-slate-400">Projects</span></div>
              </div>
              <ul className="space-y-2 text-sm">{view.donut.map((d: any) => <li key={d.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.key] }} /><span className="text-slate-600">{d.name}</span><b className="ml-auto pl-3">{d.value}</b></li>)}</ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle right={<Link href="/app/site-reports" className="text-xs font-semibold text-brand-600">View All</Link>}>Recent Site Reports</CardTitle>
          {data.reports.length === 0 ? <Empty title="No site reports yet" /> : (
            <div className="space-y-3">
              {data.reports.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3">
                  <ProjectArt photo seed={r.project?.name || r.id} className="h-12 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{r.project?.name}</div><div className="truncate text-xs text-slate-500">{r.work_completed || '—'}</div></div>
                  <div className="text-right"><div className="text-xs text-slate-500">{fmtDate(r.report_date)}</div><StatusBadge status={r.status} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <CardTitle>Pending Approvals</CardTitle>
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: 'requests', label: 'Material Requests', badge: view.requests.length },
            ...(allows('contractor_bills') ? [{ id: 'bills' as const, label: 'Contractor Bills', badge: view.bills.length }] : []),
            { id: 'expenses', label: 'Expenses', badge: view.pendExp.length }]} />
          <div className="space-y-2.5">
            {tab === 'requests' && (view.requests.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing pending</p> : view.requests.slice(0, 5).map((r: any) => (
              <Row key={r.id} title={`${r.material?.name} × ${r.quantity} ${r.material?.unit || ''}`} sub={r.project?.name} canAct={canApprove}
                onApprove={() => decide('material_requests', r.id, { status: 'approved' }, 'Request approved')} onReject={() => decide('material_requests', r.id, { status: 'rejected' }, 'Request rejected')} />)))}
            {tab === 'bills' && (view.bills.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing pending</p> : view.bills.slice(0, 5).map((b: any) => (
              <Row key={b.id} title={`${b.contractor?.name} · ${b.bill_no || ''}`} sub={`${b.project?.name} · ${inr(b.net_amount, { compact: false })}`} canAct={canApprove}
                onApprove={() => decide('contractor_bills', b.id, { status: 'approved' }, 'Bill approved')} onReject={() => decide('contractor_bills', b.id, { status: 'rejected' }, 'Bill rejected')} />)))}
            {tab === 'expenses' && (view.pendExp.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">Nothing pending</p> : view.pendExp.slice(0, 5).map((e: any) => (
              <Row key={e.id} title={`${e.description || e.category} · ${inr(e.amount, { compact: false })}`} sub={e.project?.name} canAct={canApproveExpense}
                onApprove={() => decide('expenses', e.id, { approval_status: 'approved' }, 'Expense approved')} onReject={() => decide('expenses', e.id, { approval_status: 'rejected' }, 'Expense rejected')} />)))}
          </div>
        </Card>
      </div>
      {role === 'owner' && data.projects.length === 0 && (
        <Card className="mt-5 border-brand-100 bg-brand-50 p-5 text-sm text-brand-800">
          Your workspace is empty. Go to <Link href="/app/projects" className="font-semibold underline">Projects</Link> to add your first project, or load sample data from <Link href="/app/settings" className="font-semibold underline">Settings</Link> to explore.
        </Card>
      )}
    </div>
  )
}

function Row({ title, sub, canAct, onApprove, onReject }: { title: string; sub?: string; canAct: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-800">{title}</div><div className="truncate text-xs text-slate-500">{sub}</div></div>
      {canAct && <><Btn size="sm" variant="success" onClick={onApprove}>Approve</Btn><Btn size="sm" variant="danger" onClick={onReject}>Reject</Btn></>}
    </div>
  )
}
