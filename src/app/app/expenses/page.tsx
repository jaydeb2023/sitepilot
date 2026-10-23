'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DataModule, { FieldDef } from '@/components/DataModule'
import { useApp } from '@/components/AppProvider'
import UpgradeNotice from '@/components/UpgradeNotice'
import { inputAuto, Btn, Card, CardTitle, inputCls, PageHeader, Progress, Spinner, StatusBadge, Tabs } from '@/components/ui'
import { crShort, fmtDate, inr, todayISO } from '@/lib/format'
import { FINANCE } from '@/lib/permissions'
import { store } from '@/lib/store'
import { fetchBudget } from '@/lib/prefetch'
import { EXPENSE_CATEGORIES, opt } from '@/lib/fields'

const cats = EXPENSE_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
const expFields: FieldDef[] = [
  { name: 'project_id', label: 'Project', type: 'select', required: true, from: { table: 'projects', label: 'name' } },
  { name: 'category', label: 'Category', type: 'select', options: cats, default: 'miscellaneous' },
  { name: 'kind', label: 'Type', type: 'select', options: opt('actual', 'committed', 'estimate'), default: 'actual', hint: '(only “actual” counts as spent)' },
  { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0 }, { name: 'expense_date', label: 'Date', type: 'date', default: todayISO() },
  { name: 'vendor', label: 'Vendor / paid to' }, { name: 'description', label: 'Description', type: 'textarea' },
]

function BudgetSummary() {
  const { sb } = useApp()
  const [d, setD] = useState<any>(store.get('budget') ?? null)
  const [project, setProject] = useState('')
  const load = useCallback(async () => {
    const r = await fetchBudget(sb)
    store.set('budget', r)
    setD(r)
  }, [sb])
  useEffect(() => { load() }, [load])
  if (!d) return <Spinner />
  const sum = (a: any[], k: string) => a.reduce((s, x) => s + Number(x[k]), 0)
  const rows = d.p.filter((p: any) => !project || p.id === project).map((p: any) => {
    const approved = d.e.filter((x: any) => x.project_id === p.id && x.kind === 'actual' && x.approval_status === 'approved')
    const orig = Number(p.approved_budget), rev = sum(d.r.filter((x: any) => x.project_id === p.id), 'change_amount')
    const actual = sum(approved, 'amount')
    const committed = d.o.filter((x: any) => x.project_id === p.id && x.delivery_status !== 'cancelled').reduce((s: number, x: any) => s + Number(x.amount) - Number(x.paid_amount), 0)
    const eff = orig + rev
    return { id: p.id, name: p.name, orig, rev, eff, actual, committed, remaining: eff - actual, pct: eff > 0 ? Math.round((actual / eff) * 100) : 0, approved }
  })
  const byCat = EXPENSE_CATEGORIES.map(c => ({ category: c, Actual: rows.reduce((s: number, r: any) => s + sum(r.approved.filter((x: any) => x.category === c), 'amount'), 0),
    Budget: d.b.filter((x: any) => (!project || x.project_id === project) && x.category === c).reduce((s: number, x: any) => s + Number(x.amount), 0) }))
  return (
    <div className="space-y-4">
      <select className={inputAuto + ' w-auto'} value={project} onChange={e => setProject(e.target.value)}><option value="">All projects</option>{d.p.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <Card className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {['Project', 'Original budget', 'Revisions', 'Current budget', 'Actual (recorded)', 'Committed', 'Remaining', 'Used'].map(h => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r: any) => (
          <tr key={r.id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td><td className="px-4 py-2.5">{inr(r.orig)}</td>
            <td className="px-4 py-2.5">{r.rev ? inr(r.rev) : '—'}</td><td className="px-4 py-2.5 font-semibold">{inr(r.eff)}</td><td className="px-4 py-2.5">{inr(r.actual)}</td><td className="px-4 py-2.5">{inr(r.committed)}</td>
            <td className={`px-4 py-2.5 font-semibold ${r.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{inr(r.remaining)}</td>
            <td className="w-36 px-4 py-2.5"><div className="flex items-center gap-2"><Progress value={r.pct} tone={r.pct > 100 ? 'red' : r.pct > 90 ? 'amber' : 'green'} /><span className="text-xs font-bold">{r.pct}%</span></div></td></tr>))}</tbody></table></Card>
      <Card className="p-5"><CardTitle>Cost by category <span className="text-xs font-normal text-slate-400">(budget vs recorded actual)</span></CardTitle>
        <div className="h-64"><ResponsiveContainer><BarChart data={byCat}><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" /><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => crShort(v)} width={64} />
          <Tooltip formatter={(v: any) => inr(Number(v))} /><Bar dataKey="Budget" fill="#93b4ff" radius={[4, 4, 0, 0]} /><Bar dataKey="Actual" fill="#22c55e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  )
}

export default function Expenses() {
  const { sb, can, allows } = useApp()
  const [tab, setTab] = useState<'expenses' | 'budget' | 'categories' | 'revisions'>('expenses')
  const budgetsLocked = !allows('budgets')
  const decide = async (id: string, s: string, rl: () => void) => { const { error } = await sb.from('expenses').update({ approval_status: s }).eq('id', id); if (error) toast.error(error.message); else rl() }
  return (
    <div>
      <PageHeader title="Expenses & Budgets" subtitle="Estimates, committed costs and actual payments are kept separate" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'expenses', label: 'Expenses' }, { id: 'budget', label: (budgetsLocked ? '🔒 ' : '') + 'Budget vs Actual' }, { id: 'categories', label: (budgetsLocked ? '🔒 ' : '') + 'Category Budgets' }, { id: 'revisions', label: (budgetsLocked ? '🔒 ' : '') + 'Budget Revisions' }]} />
      {tab !== 'expenses' && budgetsLocked && <UpgradeNotice feature="budgets" inline />}
      {tab === 'expenses' && (
        <DataModule table="expenses" addLabel="Add Expense" fields={expFields} writeRoles={['owner', 'manager', 'accountant', 'storekeeper', 'engineer']} editRoles={FINANCE} select="*, project:projects(name)"
          projectFilter dateFilter="expense_date" order={{ column: 'expense_date', ascending: false }} statusFilter={{ column: 'approval_status', options: opt('pending', 'approved', 'rejected'), label: 'All approvals' }}
          columns={[
            { label: 'Date', render: r => fmtDate(r.expense_date), csv: r => r.expense_date }, { label: 'Project', render: r => r.project?.name, csv: r => r.project?.name },
            { label: 'Category', key: 'category', render: r => <span className="capitalize">{r.category}</span> }, { label: 'Details', render: r => <div>{r.description || '—'}<div className="text-xs text-slate-400">{r.vendor}</div></div>, csv: r => r.description || '' },
            { label: 'Type', render: r => <StatusBadge status={r.kind} />, csv: r => r.kind }, { label: 'Amount', align: 'right', render: r => <b>{inr(r.amount, { compact: false })}</b>, csv: r => r.amount },
            { label: 'Approval', render: r => <StatusBadge status={r.approval_status} />, csv: r => r.approval_status }]}
          rowActions={(r, rl) => r.approval_status === 'pending' && can(FINANCE) && <><Btn size="sm" variant="success" onClick={() => decide(r.id, 'approved', rl)}>Approve</Btn><Btn size="sm" variant="danger" onClick={() => decide(r.id, 'rejected', rl)}>Reject</Btn></>} />)}
      {tab === 'budget' && !budgetsLocked && <BudgetSummary />}
      {tab === 'categories' && !budgetsLocked && (
        <DataModule table="budgets" addLabel="Set Category Budget" writeRoles={FINANCE} select="*, project:projects(name)" projectFilter order={{ column: 'created_at', ascending: false }}
          fields={[{ name: 'project_id', label: 'Project', type: 'select', required: true, from: { table: 'projects', label: 'name' } }, { name: 'category', label: 'Category', type: 'select', options: cats, required: true }, { name: 'amount', label: 'Budget (₹)', type: 'number', required: true, min: 0 }]}
          columns={[{ label: 'Project', render: r => r.project?.name, csv: r => r.project?.name }, { label: 'Category', key: 'category', render: r => <span className="capitalize">{r.category}</span> }, { label: 'Budget', align: 'right', render: r => inr(r.amount, { compact: false }), csv: r => r.amount }]} />)}
      {tab === 'revisions' && !budgetsLocked && (
        <DataModule table="budget_revisions" addLabel="Add Revision" writeRoles={['owner', 'manager']} noEdit select="*, project:projects(name)" projectFilter
          emptyHint="Record approved changes to a project budget here. Use a negative amount to reduce the budget."
          fields={[{ name: 'project_id', label: 'Project', type: 'select', required: true, from: { table: 'projects', label: 'name' } }, { name: 'change_amount', label: 'Change (₹, + or −)', type: 'number', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]}
          columns={[{ label: 'Date', render: r => fmtDate(r.created_at), csv: r => r.created_at }, { label: 'Project', render: r => r.project?.name, csv: r => r.project?.name },
            { label: 'Change', align: 'right', render: r => <b className={Number(r.change_amount) < 0 ? 'text-red-600' : 'text-emerald-600'}>{Number(r.change_amount) > 0 ? '+' : ''}{inr(r.change_amount, { compact: false })}</b>, csv: r => r.change_amount }, { label: 'Reason', key: 'reason' }]} />)}
    </div>
  )
}
