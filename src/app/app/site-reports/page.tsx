'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import { inputAuto, Btn, Card, Empty, inputCls, Modal, PageHeader, Spinner, StatusBadge } from '@/components/ui'
import { useSignedUrls } from '@/components/useSignedUrls'
import ProjectArt from '@/components/ProjectArt'
import { fmtDate } from '@/lib/format'
import { MANAGERS } from '@/lib/permissions'
import { store } from '@/lib/store'
import { SITE_REPORT_SELECT } from '@/lib/prefetch'

const SELECT = SITE_REPORT_SELECT

export default function SiteReports() {
  const { sb, can, user, role } = useApp()
  const [rows, setRows] = useState<any[] | null>(store.get('site-reports') ?? null)
  const [projects, setProjects] = useState<any[]>([])
  const [project, setProject] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<any>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    let query = sb.from('daily_site_reports').select(SELECT)
    if (project) query = query.eq('project_id', project)
    if (status) query = query.eq('status', status)
    if (from) query = query.gte('report_date', from)
    if (to) query = query.lte('report_date', to)
    const { data, error } = await query.order('report_date', { ascending: false }).limit(300)
    if (error) toast.error(error.message)
    if (!project && !status && !from && !to) store.set('site-reports', data || [])
    setRows(data || [])
  }, [sb, project, status, from, to])
  useEffect(() => { load() }, [load])
  useEffect(() => { sb.from('projects').select('id, name').order('name').then(({ data }: any) => setProjects(data || [])) }, [sb])

  const photos = useSignedUrls(open?.photo_paths || [])
  const list = (rows || []).filter(r => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))

  const review = async (decision: 'approved' | 'correction_requested') => {
    if (decision === 'correction_requested' && !note.trim()) return toast.error('Add a note explaining what to correct')
    const { error } = await sb.from('daily_site_reports').update({ status: decision, review_note: note || null }).eq('id', open.id)
    if (error) toast.error(error.message); else { toast.success(decision === 'approved' ? 'Report approved' : 'Correction requested'); setOpen(null); setNote(''); load() }
  }

  return (
    <div>
      <PageHeader title="Daily Site Reports" subtitle="Submitted by engineers, reviewed by managers"
        actions={can(['owner', 'manager', 'engineer']) && <Link href="/app/site-reports/new"><Btn><Plus size={15} /> New Report</Btn></Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={inputAuto + ' w-48'} placeholder="Search reports…" value={q} onChange={e => setQ(e.target.value)} />
        <select className={inputAuto + ' w-auto'} value={project} onChange={e => setProject(e.target.value)}><option value="">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className={inputAuto + ' w-auto'} value={status} onChange={e => setStatus(e.target.value)}><option value="">All status</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="correction_requested">Correction requested</option></select>
        <input type="date" className={inputAuto + ' w-auto'} value={from} onChange={e => setFrom(e.target.value)} /><input type="date" className={inputAuto + ' w-auto'} value={to} onChange={e => setTo(e.target.value)} />
      </div>
      {!rows ? <Spinner /> : list.length === 0 ? <Empty title="No site reports found" hint="Reports submitted by your site team will appear here." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(r => (
            <Card key={r.id} className="flex cursor-pointer gap-3 p-4 hover:shadow-lg" >
              <div onClick={() => { setOpen(r); setNote(r.review_note || '') }} className="flex w-full gap-3">
                <ProjectArt photo seed={r.project?.name || r.id} className="h-20 w-28 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h3 className="truncate font-semibold text-slate-900">{r.project?.name}</h3><StatusBadge status={r.status} /></div>
                  <p className="text-xs text-slate-500">{fmtDate(r.report_date)} · {r.site_name || 'Site'} · {r.workers_present} workers · {r.photo_paths?.length || 0} photos</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.work_completed}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Modal wide title={`${open.project?.name} · ${fmtDate(open.report_date)}`} onClose={() => setOpen(null)}
          footer={<>
            {(open.created_by === user.id && open.status !== 'approved') && <Link href={`/app/site-reports/${open.id}/edit`}><Btn variant="secondary">Edit & resubmit</Btn></Link>}
            {can(MANAGERS) && open.status !== 'approved' && <><Btn variant="danger" onClick={() => review('correction_requested')}>Request correction</Btn><Btn onClick={() => review('approved')}>Approve</Btn></>}
          </>}>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2"><StatusBadge status={open.status} /><span className="text-slate-500">{open.site_name} · {open.weather || '—'} · by {open.creator?.full_name || '—'}</span></div>
            <Section t="Work completed">{open.work_completed}</Section>
            <div className="grid gap-4 sm:grid-cols-2">
              <Section t={`Workers on site (${open.workers_present})`}>{(open.workers_breakdown || []).map((w: any) => `${w.trade}: ${w.count}`).join(' · ') || '—'}</Section>
              <Section t="Materials used">{(open.materials_used || []).map((m: any) => `${m.material} ${m.qty} ${m.unit}`).join(' · ') || '—'}</Section>
              <Section t="Equipment">{open.equipment_used}</Section><Section t="Delays / issues">{open.issues}</Section>
              <Section t="Safety">{open.safety_notes}</Section><Section t="Next day plan">{open.next_day_plan}</Section>
            </div>
            {open.photo_paths?.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{open.photo_paths.map((p: string) => photos[p] ? <a key={p} href={photos[p]} target="_blank" rel="noreferrer"><img src={photos[p]} alt="Site" className="aspect-square w-full rounded-lg object-cover" /></a> : <div key={p} className="aspect-square rounded-lg bg-slate-100" />)}</div>}
            {open.review_note && open.status !== 'approved' && <p className="rounded-lg bg-violet-50 p-3 text-violet-800"><b>Reviewer note:</b> {open.review_note}</p>}
            {can(MANAGERS) && open.status !== 'approved' && <div><label className="mb-1 block text-xs font-semibold text-slate-600">Review note</label><textarea className={inputCls} rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>}
          </div>
        </Modal>
      )}
    </div>
  )
}
function Section({ t, children }: { t: string; children: any }) { return <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t}</div><div className="mt-0.5 whitespace-pre-wrap text-slate-700">{children || '—'}</div></div> }
