'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import { inputAuto, Btn, Card, Empty, inputCls, PageHeader, Progress, Spinner, StatusBadge } from '@/components/ui'
import { FormModal } from '@/components/DataModule'
import ProjectArt from '@/components/ProjectArt'
import { projectFields, opt, PROJECT_TYPES } from '@/lib/fields'
import { fmtDate, inr } from '@/lib/format'
import { MANAGERS } from '@/lib/permissions'

let projectsCache: any[] | null = null

export default function ProjectsPage() {
  const { sb, can } = useApp()
  const [rows, setRows] = useState<any[] | null>(projectsCache)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    projectsCache = data || []
    setRows(data || [])
  }, [sb])
  useEffect(() => { load(); setQ(new URLSearchParams(window.location.search).get('q') || '') }, [load])

  const list = useMemo(() => (rows || []).filter(p =>
    (!status || p.status === status) && (!type || p.project_type === type) &&
    (!q || `${p.name} ${p.code} ${p.client_name}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, status, type])

  return (
    <div>
      <PageHeader title="Projects" subtitle="All construction projects and sites"
        actions={can(MANAGERS) && <Btn onClick={() => setAdding(true)}><Plus size={15} /> New Project</Btn>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={inputCls + ' pl-9'} placeholder="Search projects…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className={inputAuto + ' w-auto'} value={status} onChange={e => setStatus(e.target.value)}><option value="">All status</option>{opt('planning', 'on_track', 'delayed', 'at_risk', 'completed').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className={inputAuto + ' w-auto'} value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      {!rows ? <Spinner /> : list.length === 0 ? (
        <Empty title="No projects found" hint={can(MANAGERS) ? 'Create your first project to start tracking sites, labour, materials and costs.' : 'You have not been assigned to any project yet.'}
          action={can(MANAGERS) && <Btn onClick={() => setAdding(true)}>New Project</Btn>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(p => (
            <Link key={p.id} href={`/app/projects/${p.id}`}>
              <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
                <ProjectArt seed={p.name} crane={p.status !== 'completed'} className="h-32 w-full" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900">{p.name}</h3><p className="text-xs text-slate-500">{p.project_type}{p.client_name ? ` · ${p.client_name}` : ''}</p></div><StatusBadge status={p.status} /></div>
                  <div className="mt-3 flex items-center gap-2"><div className="flex-1"><Progress value={p.progress} tone={p.status === 'delayed' ? 'red' : p.status === 'at_risk' ? 'amber' : 'green'} /></div><span className="text-xs font-bold text-slate-700">{p.progress}%</span></div>
                  <div className="mt-3 flex justify-between text-xs text-slate-500"><span>Start {fmtDate(p.start_date)}</span><span>Target {fmtDate(p.target_date)}</span></div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{inr(p.contract_value)}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {adding && <FormModal title="New Project" fields={projectFields} onClose={() => setAdding(false)} onSubmit={async v => {
        const { error } = await sb.from('projects').insert(v)
        if (error) { toast.error(error.message); return false }
        toast.success('Project created'); load()
      }} />}
    </div>
  )
}
