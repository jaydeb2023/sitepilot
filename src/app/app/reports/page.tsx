'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '@/components/AppProvider'
import { inputAuto, Btn, Card, CardTitle, Empty, inputCls, PageHeader, Spinner } from '@/components/ui'
import { crShort, daysBetween, fmtDate, inr, titleCase, todayISO } from '@/lib/format'
import { downloadCSV } from '@/lib/csv'
import { store } from '@/lib/store'
import { defaultRange, fetchReports, reportsKey } from '@/lib/prefetch'

type Rep = { columns: string[]; rows: (string | number)[][] }

export default function Reports() {
  const { sb } = useApp()
  const [d, setD] = useState<any>(() => { const r = defaultRange(); return store.get(reportsKey(r.from, r.to)) ?? null })
  const [project, setProject] = useState('')
  const [from, setFrom] = useState(() => defaultRange().from)
  const [to, setTo] = useState(() => defaultRange().to)
  const [type, setType] = useState('progress')

  const load = useCallback(async () => {
    const r = await fetchReports(sb, from, to)
    store.set(reportsKey(from, to), r)
    setD(r)
  }, [sb, from, to])
  useEffect(() => { load() }, [load])

  const built = useMemo(() => {
    if (!d) return null
    const inP = (x: any) => !project || x.project_id === project
    const ps = d.projects.filter((p: any) => !project || p.id === project)
    const exp = d.expenses.filter(inP).filter((e: any) => e.expense_date >= from && e.expense_date <= to)
    const att = d.attendance.filter(inP), mov = d.movements.filter(inP), pos = d.pos.filter(inP), bills = d.bills.filter(inP), tasks = d.tasks.filter(inP), reps = d.reports.filter(inP)
    const mat = Object.fromEntries(d.materials.map((m: any) => [m.id, m])); const pname = Object.fromEntries(d.projects.map((p: any) => [p.id, p.name]))
    const sum = (a: any[], f: (x: any) => number) => a.reduce((s, x) => s + f(x), 0)
    const planned = (p: any) => (p.start_date && p.target_date ? Math.round(Math.min(1, Math.max(0, daysBetween(p.start_date, todayISO()) / Math.max(1, daysBetween(p.start_date, p.target_date)))) * 100) : 0)
    const budgetRows = ps.map((p: any) => {
      const eff = Number(p.approved_budget) + sum(d.revisions.filter((r: any) => r.project_id === p.id), r => Number(r.change_amount))
      const actual = sum(d.expenses.filter((e: any) => e.project_id === p.id), e => Number(e.amount))
      const committed = sum(d.pos.filter((o: any) => o.project_id === p.id && o.delivery_status !== 'cancelled'), o => Number(o.amount) - Number(o.paid_amount))
      return { p, eff, actual, committed }
    })
    const R: Record<string, { label: string } & Rep> = {
      progress: { label: 'Project progress', columns: ['Project', 'Status', 'Actual %', 'Time elapsed %', 'Variance', 'Start', 'Target'], rows: ps.map((p: any) => [p.name, titleCase(p.status), p.progress, planned(p), p.progress - planned(p), fmtDate(p.start_date), fmtDate(p.target_date)]) },
      daily: { label: 'Daily site reports', columns: ['Date', 'Project', 'Site', 'Workers', 'Status', 'Work completed'], rows: reps.map((r: any) => [fmtDate(r.report_date), r.project?.name, r.site_name || '', r.workers_present, titleCase(r.status), r.work_completed || '']) },
      attendance: { label: 'Labour attendance', columns: ['Date', 'Worker', 'Category', 'Project', 'Status', 'Hours', 'OT'], rows: att.map((a: any) => [fmtDate(a.work_date), a.worker?.name, a.worker?.category, a.project?.name, titleCase(a.status), a.regular_hours, a.overtime_hours]) },
      labour_cost: { label: 'Labour cost', columns: ['Project', 'Days worked', 'Payable', 'Paid', 'Unpaid'], rows: ps.map((p: any) => { const a = att.filter((x: any) => x.project_id === p.id); return [p.name, a.filter((x: any) => x.status !== 'absent').length, sum(a, x => Number(x.amount)), sum(a.filter((x: any) => x.wage_paid), x => Number(x.amount)), sum(a.filter((x: any) => !x.wage_paid), x => Number(x.amount))] }) },
      consumption: { label: 'Material consumption', columns: ['Material', 'Unit', 'Quantity issued', 'Site'], rows: Object.values(mov.filter((m: any) => m.movement_type === 'issue').reduce((acc: any, m: any) => { const key = m.material_id + m.project_id; acc[key] ||= [m.material?.name, m.material?.unit, 0, m.project?.name]; acc[key][2] += Number(m.quantity); return acc }, {})) as any },
      stock: { label: 'Material stock', columns: ['Material', 'Site', 'Unit', 'Balance', 'Minimum', 'Status'], rows: d.balances.filter(inP).filter((b: any) => mat[b.material_id]).map((b: any) => [mat[b.material_id].name, pname[b.project_id], mat[b.material_id].unit, Number(b.balance), Number(mat[b.material_id].min_stock), Number(b.balance) <= Number(mat[b.material_id].min_stock) ? 'Low' : 'OK']) },
      purchases: { label: 'Purchases by supplier', columns: ['Supplier', 'Orders', 'Ordered amount', 'Paid', 'Outstanding'], rows: Object.values(pos.reduce((acc: any, o: any) => { const n = o.supplier?.name || 'Unassigned'; acc[n] ||= [n, 0, 0, 0, 0]; acc[n][1]++; acc[n][2] += Number(o.amount); acc[n][3] += Number(o.paid_amount); acc[n][4] += Number(o.amount) - Number(o.paid_amount); return acc }, {})) as any },
      bills: { label: 'Contractor bills', columns: ['Bill', 'Contractor', 'Project', 'Net', 'Paid', 'Balance', 'Status'], rows: bills.map((b: any) => [b.bill_no, b.contractor?.name, b.project?.name, Number(b.net_amount), Number(b.paid_amount), Number(b.net_amount) - Number(b.paid_amount), titleCase(b.status)]) },
      expenses: { label: 'Recorded expenses', columns: ['Category', 'Entries', 'Amount'], rows: Object.values(exp.reduce((acc: any, e: any) => { acc[e.category] ||= [titleCase(e.category), 0, 0]; acc[e.category][1]++; acc[e.category][2] += Number(e.amount); return acc }, {})) as any },
      budget: { label: 'Budget vs actual', columns: ['Project', 'Budget', 'Actual', 'Committed', 'Remaining', 'Variance %'], rows: budgetRows.map((b: any) => [b.p.name, b.eff, b.actual, b.committed, b.eff - b.actual, b.eff ? Math.round(((b.actual - b.eff) / b.eff) * 100) : 0]) },
      outstanding: { label: 'Outstanding payments', columns: ['Type', 'Party', 'Reference', 'Project', 'Outstanding'], rows: [
        ...pos.filter((o: any) => Number(o.amount) - Number(o.paid_amount) > 0 && o.delivery_status !== 'cancelled').map((o: any) => ['Supplier', o.supplier?.name || '—', o.po_number || '', o.project?.name, Number(o.amount) - Number(o.paid_amount)]),
        ...bills.filter((b: any) => b.status === 'approved' && Number(b.net_amount) - Number(b.paid_amount) > 0).map((b: any) => ['Contractor', b.contractor?.name, b.bill_no, b.project?.name, Number(b.net_amount) - Number(b.paid_amount)])] },
      delayed: { label: 'Delayed tasks', columns: ['Task', 'Project', 'Assignee', 'Due', 'Days overdue', 'Status'], rows: tasks.filter((t: any) => t.due_date && t.due_date < todayISO()).map((t: any) => [t.title, t.project?.name, t.assignee?.full_name || '—', fmtDate(t.due_date), daysBetween(t.due_date, todayISO()), titleCase(t.status)]) },
    }
    return { R, ps, budgetRows }
  }, [d, project, from, to])

  if (!built) return <Spinner />
  const rep = built.R[type]
  const totalBudget = built.budgetRows.reduce((s: number, b: any) => s + b.eff, 0), totalActual = built.budgetRows.reduce((s: number, b: any) => s + b.actual, 0), totalCommitted = built.budgetRows.reduce((s: number, b: any) => s + b.committed, 0)
  const donut = [{ n: 'Actual expense', v: totalActual, c: '#2250e8' }, { n: 'Committed', v: totalCommitted, c: '#f59e0b' }, { n: 'Remaining', v: Math.max(0, totalBudget - totalActual - totalCommitted), c: '#22c55e' }]
  const prog = built.ps.map((p: any) => ({ name: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name, Actual: p.progress, 'Time elapsed': p.start_date && p.target_date ? Math.round(Math.min(1, Math.max(0, daysBetween(p.start_date, todayISO()) / Math.max(1, daysBetween(p.start_date, p.target_date)))) * 100) : 0 }))

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Figures are computed from your recorded data for the selected filters" actions={<>
        <select className={inputAuto + ' w-auto'} value={project} onChange={e => setProject(e.target.value)}><option value="">All projects</option>{d.projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="date" className={inputAuto + ' w-auto'} value={from} onChange={e => setFrom(e.target.value)} /><input type="date" className={inputAuto + ' w-auto'} value={to} onChange={e => setTo(e.target.value)} /></>} />
      <div className="grid gap-4 lg:grid-cols-3 no-print">
        <Card className="p-5 lg:col-span-2"><CardTitle>Project progress vs time elapsed</CardTitle><div className="h-56"><ResponsiveContainer><BarChart data={prog}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} domain={[0, 100]} /><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Time elapsed" fill="#c7d7fe" radius={[4, 4, 0, 0]} /><Bar dataKey="Actual" fill="#2250e8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><CardTitle>Budget vs actual</CardTitle><div className="relative h-56"><ResponsiveContainer><PieChart><Pie data={donut} dataKey="v" nameKey="n" innerRadius={55} outerRadius={80} stroke="none">{donut.map(x => <Cell key={x.n} fill={x.c} />)}</Pie><Tooltip formatter={(v: any) => inr(Number(v))} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 top-[34%] text-center"><div className="text-lg font-bold">{crShort(totalBudget)}</div><div className="text-[10px] text-slate-400">Total budget</div></div></div></Card>
      </div>
      <Card className="mt-4 p-5">
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
          <select className={inputAuto + ' w-auto font-semibold'} value={type} onChange={e => setType(e.target.value)}>{Object.entries(built.R).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <div className="ml-auto flex gap-2"><Btn variant="secondary" onClick={() => window.print()}><Printer size={14} /> Print</Btn><Btn onClick={() => downloadCSV(rep.label.replace(/\s+/g, '-').toLowerCase(), rep.columns, rep.rows)} disabled={!rep.rows.length}>Export CSV</Btn></div>
        </div>
        <h3 className="mb-1 text-base font-bold">{rep.label}</h3><p className="mb-3 text-xs text-slate-400">{project ? built.ps[0]?.name : 'All projects'} · {fmtDate(from)} to {fmtDate(to)}</p>
        {rep.rows.length === 0 ? <Empty title="No data for these filters" /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{rep.columns.map(c => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>
            <tbody>{rep.rows.map((r, i) => <tr key={i} className="border-b border-slate-50">{r.map((c, j) => <td key={j} className="px-3 py-2 text-slate-700">{typeof c === 'number' && c > 999 ? c.toLocaleString('en-IN') : c}</td>)}</tr>)}</tbody></table></div>)}
      </Card>
    </div>
  )
}
