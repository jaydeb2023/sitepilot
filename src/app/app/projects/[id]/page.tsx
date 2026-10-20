'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil, Trash2, UserPlus, X } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import { Btn, Card, CardTitle, Empty, inputCls, Progress, Spinner, StatusBadge } from '@/components/ui'
import { FormModal } from '@/components/DataModule'
import ProjectArt from '@/components/ProjectArt'
import { projectFields } from '@/lib/fields'
import { fmtDate, inr } from '@/lib/format'
import { MANAGERS } from '@/lib/permissions'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { sb, can, role } = useApp()
  const [d, setD] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [addMember, setAddMember] = useState('')
  const [people, setPeople] = useState<any[]>([])

  const load = useCallback(async () => {
    const [p, exp, rev, pos, tasks, reps, mem, sites] = await Promise.all([
      sb.from('projects').select('*, manager:profiles!manager_id(full_name)').eq('id', id).maybeSingle(),
      sb.from('expenses').select('amount').eq('project_id', id).eq('kind', 'actual').eq('approval_status', 'approved'),
      sb.from('budget_revisions').select('change_amount').eq('project_id', id),
      sb.from('purchase_orders').select('amount, paid_amount, delivery_status').eq('project_id', id),
      sb.from('tasks').select('id, title, status, due_date, progress').eq('project_id', id).neq('status', 'done').order('due_date').limit(6),
      sb.from('daily_site_reports').select('id, report_date, work_completed, status').eq('project_id', id).order('report_date', { ascending: false }).limit(5),
      sb.from('project_members').select('user_id, user:profiles!user_id(full_name, role)').eq('project_id', id),
      sb.from('project_sites').select('id, name').eq('project_id', id),
    ])
    if (!p.data) { setD({ missing: true }); return }
    const sum = (r: any, k: string) => (r.data || []).reduce((s: number, x: any) => s + Number(x[k]), 0)
    const budget = Number(p.data.approved_budget) + sum(rev, 'change_amount')
    const actual = sum(exp, 'amount')
    const committed = (pos.data || []).filter((o: any) => o.delivery_status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.amount) - Number(o.paid_amount), 0)
    setD({ p: p.data, budget, actual, committed, tasks: tasks.data || [], reports: reps.data || [], members: mem.data || [], sites: sites.data || [] })
    if (can(MANAGERS)) { const { data } = await sb.from('profiles').select('id, full_name, role').eq('active', true).order('full_name'); setPeople(data || []) }
  }, [sb, id, can])
  useEffect(() => { load() }, [load])

  if (!d) return <Spinner />
  if (d.missing) return <Empty title="Project not found" hint="It may have been removed or you may not be assigned to it." action={<Link href="/app/projects" className="text-sm font-semibold text-brand-600">Back to projects</Link>} />
  const { p } = d
  const remaining = d.budget - d.actual
  const util = d.budget > 0 ? Math.round((d.actual / d.budget) * 100) : 0

  const addMem = async () => {
    if (!addMember) return
    const { error } = await sb.from('project_members').insert({ project_id: id, user_id: addMember })
    if (error) toast.error(error.message); else { setAddMember(''); load() }
  }
  const delMem = async (uid: string) => { await sb.from('project_members').delete().eq('project_id', id).eq('user_id', uid); load() }
  const del = async () => {
    if (!confirm(`Delete "${p.name}" and ALL its reports, stock, bills and expenses? This cannot be undone.`)) return
    const { error } = await sb.from('projects').delete().eq('id', id)
    if (error) toast.error(error.message); else router.push('/app/projects')
  }

  return (
    <div>
      <Link href="/app/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={14} /> Projects</Link>
      <Card className="overflow-hidden">
        <div className="relative"><ProjectArt seed={p.name} crane className="h-36 w-full sm:h-44" /></div>
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-xl font-bold text-slate-900">{p.name}</h1><StatusBadge status={p.status} /></div>
            <p className="mt-1 text-sm text-slate-500">{p.code} · {p.project_type} · {p.client_name || 'No client'} · {p.site_address || 'No address'}</p>
            <p className="mt-0.5 text-xs text-slate-400">{fmtDate(p.start_date)} → {fmtDate(p.target_date)} · Manager: {p.manager?.full_name || '—'}</p>
          </div>
          {can(MANAGERS) && <div className="flex gap-2"><Btn variant="secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Btn>{role === 'owner' && <Btn variant="danger" onClick={del}><Trash2 size={14} /></Btn>}</div>}
        </div>
        <div className="border-t border-slate-100 px-5 py-4"><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-600">Progress</span><b>{p.progress}%</b></div><Progress value={p.progress} /></div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[['Contract value', inr(p.contract_value)], ['Approved budget', inr(d.budget)], ['Recorded expenses', inr(d.actual)], ['Committed (unpaid POs)', inr(d.committed)], ['Remaining budget', inr(remaining)]].map(([l, v], i) => (
          <Card key={l} className="p-4"><div className="text-xs text-slate-500">{l}</div><div className={`mt-1 text-lg font-bold ${i === 4 && remaining < 0 ? 'text-red-600' : 'text-slate-900'}`}>{v}</div>{i === 2 && <div className="text-[11px] text-slate-400">{util}% of budget</div>}</Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><CardTitle right={<Link href="/app/tasks" className="text-xs font-semibold text-brand-600">All tasks</Link>}>Open tasks</CardTitle>
          {d.tasks.length === 0 ? <p className="text-sm text-slate-400">No open tasks</p> : d.tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between border-b border-slate-50 py-2 text-sm last:border-0"><span className="truncate pr-2">{t.title}</span><StatusBadge status={t.status} /></div>))}</Card>
        <Card className="p-5"><CardTitle right={<Link href="/app/site-reports" className="text-xs font-semibold text-brand-600">All reports</Link>}>Recent site reports</CardTitle>
          {d.reports.length === 0 ? <p className="text-sm text-slate-400">No reports yet</p> : d.reports.map((r: any) => (
            <div key={r.id} className="border-b border-slate-50 py-2 text-sm last:border-0"><div className="flex justify-between"><span className="font-medium">{fmtDate(r.report_date)}</span><StatusBadge status={r.status} /></div><p className="truncate text-xs text-slate-500">{r.work_completed}</p></div>))}</Card>
        <Card className="p-5"><CardTitle>Team &amp; sites</CardTitle>
          <div className="mb-3 flex flex-wrap gap-1.5">{d.sites.map((s: any) => <span key={s.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{s.name}</span>)}</div>
          {d.members.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between py-1.5 text-sm"><span>{m.user?.full_name} <span className="text-xs text-slate-400">({m.user?.role})</span></span>
              {can(MANAGERS) && <button onClick={() => delMem(m.user_id)} className="text-slate-300 hover:text-red-500"><X size={14} /></button>}</div>))}
          {can(MANAGERS) && (
            <div className="mt-3 flex gap-2"><select className={inputCls} value={addMember} onChange={e => setAddMember(e.target.value)}><option value="">Assign staff…</option>
              {people.filter(x => !d.members.some((m: any) => m.user_id === x.id)).map(x => <option key={x.id} value={x.id}>{x.full_name} ({x.role})</option>)}</select>
              <Btn onClick={addMem} variant="secondary"><UserPlus size={14} /></Btn></div>)}
          <p className="mt-2 text-[11px] text-slate-400">Site engineers and contractors only see projects they are assigned to.</p></Card>
      </div>
      {editing && <FormModal title="Edit Project" fields={projectFields} initial={p} onClose={() => setEditing(false)} onSubmit={async v => {
        const { error } = await sb.from('projects').update(v).eq('id', id)
        if (error) { toast.error(error.message); return false }
        toast.success('Project updated'); load()
      }} />}
    </div>
  )
}
