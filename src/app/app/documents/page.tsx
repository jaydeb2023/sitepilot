'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import { Btn, Card, Empty, inputCls, Modal, PageHeader, Spinner, Label } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { BUCKET, uploadFile } from '@/lib/upload'
import { MANAGERS } from '@/lib/permissions'
import { opt } from '@/lib/fields'

const CATS = opt('drawing', 'photo', 'daily_report', 'purchase_order', 'bill', 'contract', 'certificate', 'other')

export default function Documents() {
  const { sb, companyId, can } = useApp()
  const [rows, setRows] = useState<any[] | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [project, setProject] = useState('')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [up, setUp] = useState(false)
  const [form, setForm] = useState({ project_id: '', category: 'drawing', file: null as File | null })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    let query = sb.from('documents').select('*, project:projects(name)')
    if (project) query = query.eq('project_id', project)
    if (cat) query = query.eq('category', cat)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(300)
    if (error) toast.error(error.message); setRows(data || [])
  }, [sb, project, cat])
  useEffect(() => { load() }, [load])
  useEffect(() => { sb.from('projects').select('id, name').order('name').then(({ data }: any) => setProjects(data || [])) }, [sb])

  const upload = async () => {
    if (!form.file) return toast.error('Choose a file')
    setBusy(true)
    try {
      const path = await uploadFile(sb, companyId, `documents/${form.project_id || 'general'}`, form.file)
      const { error } = await sb.from('documents').insert({ project_id: form.project_id || null, category: form.category, name: form.file.name, storage_path: path, mime_type: form.file.type, size_bytes: form.file.size })
      if (error) { await sb.storage.from(BUCKET).remove([path]); throw new Error(error.message) }
      toast.success('Uploaded'); setUp(false); setForm({ project_id: '', category: 'drawing', file: null }); load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }
  const download = async (d: any) => {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(d.storage_path, 120, { download: d.name })
    if (error) toast.error(error.message); else window.open(data.signedUrl, '_blank')
  }
  const remove = async (d: any) => {
    if (!confirm(`Delete ${d.name}?`)) return
    const { error } = await sb.from('documents').delete().eq('id', d.id)
    if (error) return toast.error(error.message)
    await sb.storage.from(BUCKET).remove([d.storage_path]); load()
  }
  const list = (rows || []).filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <PageHeader title="Documents" subtitle="Drawings, contracts, bills and certificates — stored privately per company"
        actions={<Btn onClick={() => setUp(true)}><Upload size={15} /> Upload</Btn>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' w-56'} placeholder="Search files…" value={q} onChange={e => setQ(e.target.value)} />
        <select className={inputCls + ' w-auto'} value={project} onChange={e => setProject(e.target.value)}><option value="">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className={inputCls + ' w-auto'} value={cat} onChange={e => setCat(e.target.value)}><option value="">All types</option>{CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
      </div>
      {!rows ? <Spinner /> : list.length === 0 ? <Empty title="No documents yet" hint="Upload PDFs, images, Word or Excel files up to 15 MB." /> : (
        <Card className="divide-y divide-slate-50">
          {list.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FileText size={18} /></span>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-900">{d.name}</div>
                <div className="text-xs text-slate-400">{d.project?.name || 'General'} · {d.category.replace('_', ' ')} · {fmtDate(d.created_at)} · {d.size_bytes ? `${(d.size_bytes / 1024 / 1024).toFixed(2)} MB` : ''}</div></div>
              <Btn size="sm" variant="secondary" onClick={() => download(d)}><Download size={13} /></Btn>
              {can(MANAGERS) && <button onClick={() => remove(d)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>}
            </div>))}
        </Card>)}
      {up && <Modal title="Upload document" onClose={() => setUp(false)} footer={<><Btn variant="secondary" onClick={() => setUp(false)}>Cancel</Btn><Btn onClick={upload} loading={busy}>Upload</Btn></>}>
        <div className="space-y-3">
          <div><Label>Project</Label><select className={inputCls} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}><option value="">General (no project)</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><Label>Type</Label><select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><Label>File</Label><input type="file" className={inputCls} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} /></div>
        </div></Modal>}
    </div>
  )
}
