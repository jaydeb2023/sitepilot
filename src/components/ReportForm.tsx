'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Camera, Minus, Plus, X } from 'lucide-react'
import { useApp } from './AppProvider'
import { inputAuto, Btn, Card, CardTitle, inputCls, Label, Spinner } from './ui'
import { useSignedUrls } from './useSignedUrls'
import { TRADES } from '@/lib/fields'
import { todayISO } from '@/lib/format'
import { uploadFile, validateFile } from '@/lib/upload'

const WEATHER = ['Clear', 'Cloudy', 'Light rain', 'Heavy rain', 'Hot', 'Windy']

export default function ReportForm({ reportId }: { reportId?: string }) {
  const { sb, companyId } = useApp()
  const router = useRouter()
  const [ready, setReady] = useState(!reportId)
  const [projects, setProjects] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [f, setF] = useState<any>({ project_id: '', site_name: '', report_date: todayISO(), weather: 'Clear', work_completed: '', equipment_used: '', issues: '', safety_notes: '', next_day_plan: '' })
  const [workers, setWorkers] = useState<{ trade: string; count: number }[]>([{ trade: 'Mason', count: 0 }, { trade: 'Helper', count: 0 }])
  const [used, setUsed] = useState<{ material: string; qty: number; unit: string }[]>([])
  const [existing, setExisting] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }))
  const urls = useSignedUrls(existing)
  const previews = useMemo(() => files.map(file => URL.createObjectURL(file)), [files])

  useEffect(() => {
    sb.from('projects').select('id, name').neq('status', 'completed').order('name').then(({ data }: any) => setProjects(data || []))
    sb.from('materials').select('name, unit').order('name').then(({ data }: any) => setMaterials(data || []))
    if (reportId) sb.from('daily_site_reports').select('*').eq('id', reportId).maybeSingle().then(({ data }: any) => {
      if (data) {
        setF({ ...data }); setWorkers(data.workers_breakdown?.length ? data.workers_breakdown : [{ trade: 'Mason', count: 0 }])
        setUsed(data.materials_used || []); setExisting(data.photo_paths || [])
      }
      setReady(true)
    })
  }, [sb, reportId])

  useEffect(() => {
    if (!f.project_id) { setSites([]); return }
    sb.from('project_sites').select('name').eq('project_id', f.project_id).then(({ data }: any) => setSites(data || []))
  }, [sb, f.project_id])

  const total = workers.reduce((s, w) => s + Number(w.count || 0), 0)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const ok: File[] = []
    Array.from(list).forEach(file => {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name}: photos only`); return }
      const bad = validateFile(file); if (bad) toast.error(bad); else ok.push(file)
    })
    setFiles(x => [...x, ...ok].slice(0, 12))
  }

  const submit = async () => {
    if (!f.project_id) return toast.error('Select a project')
    if (!f.work_completed?.trim()) return toast.error('Describe the work completed')
    setSaving(true)
    try {
      const paths = [...existing]
      for (const file of files) paths.push(await uploadFile(sb, companyId, `reports/${f.project_id}`, file))
      const payload = {
        project_id: f.project_id, site_name: f.site_name || null, report_date: f.report_date, weather: f.weather,
        workers_present: total, workers_breakdown: workers.filter(w => w.count > 0), work_completed: f.work_completed,
        materials_used: used.filter(m => m.material && m.qty > 0), equipment_used: f.equipment_used || null, issues: f.issues || null,
        safety_notes: f.safety_notes || null, next_day_plan: f.next_day_plan || null, photo_paths: paths, status: 'submitted',
      }
      const { error } = reportId ? await sb.from('daily_site_reports').update(payload).eq('id', reportId) : await sb.from('daily_site_reports').insert(payload)
      if (error) throw new Error(error.message)
      toast.success(reportId ? 'Report resubmitted' : 'Report submitted for review')
      router.push('/app/site-reports')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (!ready) return <Spinner />
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app/site-reports" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft size={14} /> Back</Link>
      <h1 className="mb-4 text-xl font-bold text-slate-900">{reportId ? 'Edit Site Report' : 'Create Site Report'}</h1>
      <Card className="mb-4 grid gap-3 p-5 sm:grid-cols-4">
        <div className="sm:col-span-2"><Label hint="*">Project</Label><select className={inputCls} value={f.project_id} onChange={e => set('project_id', e.target.value)}><option value="">Select project…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><Label>Site / Block</Label><input className={inputCls} list="sites" value={f.site_name || ''} onChange={e => set('site_name', e.target.value)} /><datalist id="sites">{sites.map(s => <option key={s.name} value={s.name} />)}</datalist></div>
        <div><Label>Report date</Label><input type="date" className={inputCls} value={f.report_date} onChange={e => set('report_date', e.target.value)} /></div>
        <div><Label>Weather</Label><select className={inputCls} value={f.weather || ''} onChange={e => set('weather', e.target.value)}>{WEATHER.map(w => <option key={w}>{w}</option>)}</select></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><CardTitle>Work progress</CardTitle>
          <Label hint="*">Work completed today</Label><textarea className={inputCls} rows={4} value={f.work_completed || ''} onChange={e => set('work_completed', e.target.value)} />
          <div className="mt-3"><Label>Equipment used</Label><input className={inputCls} value={f.equipment_used || ''} onChange={e => set('equipment_used', e.target.value)} /></div>
          <div className="mt-3"><Label>Delays / issues</Label><textarea className={inputCls} rows={2} value={f.issues || ''} onChange={e => set('issues', e.target.value)} /></div>
          <div className="mt-3"><Label>Safety observations</Label><textarea className={inputCls} rows={2} value={f.safety_notes || ''} onChange={e => set('safety_notes', e.target.value)} /></div>
          <div className="mt-3"><Label>Plan for next day</Label><textarea className={inputCls} rows={2} value={f.next_day_plan || ''} onChange={e => set('next_day_plan', e.target.value)} /></div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5"><CardTitle right={<span className="text-xs text-slate-500">Photos ({existing.length + files.length}/12)</span>}>Site photos</CardTitle>
            <div className="grid grid-cols-4 gap-2">
              {existing.map(p => <div key={p} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">{urls[p] && <img src={urls[p]} alt="" className="h-full w-full object-cover" />}
                <button onClick={() => setExisting(x => x.filter(y => y !== p))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button></div>)}
              {previews.map((u, i) => <div key={u} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100"><img src={u} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setFiles(x => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button></div>)}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400 hover:border-brand-400 hover:text-brand-600">
                <Camera size={20} /> Add<input type="file" accept="image/*" multiple capture="environment" hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }} /></label>
            </div></Card>

          <Card className="p-5"><CardTitle right={<span className="text-xs font-semibold text-slate-600">Total: {total}</span>}>Workers on site</CardTitle>
            {workers.map((w, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <select className={inputCls} value={w.trade} onChange={e => setWorkers(x => x.map((y, j) => j === i ? { ...y, trade: e.target.value } : y))}>{TRADES.map(t => <option key={t}>{t}</option>)}</select>
                <div className="flex items-center gap-1"><button onClick={() => setWorkers(x => x.map((y, j) => j === i ? { ...y, count: Math.max(0, y.count - 1) } : y))} className="rounded border p-1.5"><Minus size={12} /></button>
                  <input type="number" min={0} className={inputAuto + ' w-16 text-center'} value={w.count} onChange={e => setWorkers(x => x.map((y, j) => j === i ? { ...y, count: Number(e.target.value) } : y))} />
                  <button onClick={() => setWorkers(x => x.map((y, j) => j === i ? { ...y, count: y.count + 1 } : y))} className="rounded border p-1.5"><Plus size={12} /></button></div>
                <button onClick={() => setWorkers(x => x.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
              </div>))}
            <Btn size="sm" variant="secondary" onClick={() => setWorkers(x => [...x, { trade: 'Helper', count: 0 }])}><Plus size={12} /> Add trade</Btn></Card>

          <Card className="p-5"><CardTitle>Materials used <span className="text-xs font-normal text-slate-400">(information only)</span></CardTitle>
            {used.map((m, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <select className={inputCls} value={m.material} onChange={e => setUsed(x => x.map((y, j) => j === i ? { ...y, material: e.target.value, unit: materials.find(a => a.name === e.target.value)?.unit || '' } : y))}><option value="">Material…</option>{materials.map(a => <option key={a.name}>{a.name}</option>)}</select>
                <input type="number" min={0} className={inputAuto + ' w-24'} value={m.qty} onChange={e => setUsed(x => x.map((y, j) => j === i ? { ...y, qty: Number(e.target.value) } : y))} />
                <span className="w-10 text-xs text-slate-400">{m.unit}</span>
                <button onClick={() => setUsed(x => x.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
              </div>))}
            <Btn size="sm" variant="secondary" onClick={() => setUsed(x => [...x, { material: '', qty: 0, unit: '' }])}><Plus size={12} /> Add material</Btn>
            <p className="mt-2 text-[11px] text-slate-400">Stock is reduced only when materials are issued from the Materials page.</p></Card>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Link href="/app/site-reports"><Btn variant="secondary">Cancel</Btn></Link><Btn onClick={submit} loading={saving}>{reportId ? 'Resubmit for review' : 'Submit report'}</Btn></div>
    </div>
  )
}
