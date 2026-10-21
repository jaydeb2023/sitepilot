'use client'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from './AppProvider'
import { inputAuto, Btn, Card, Empty, inputCls, Label, Modal, Spinner } from './ui'
import { downloadCSV } from '@/lib/csv'
import { MANAGERS, Role } from '@/lib/permissions'

export type Opt = { value: string; label: string }
export type FieldDef = {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'email' | 'tel'
  required?: boolean
  options?: Opt[]
  from?: { table: string; value?: string; label: string; filter?: Record<string, any> }
  default?: any
  full?: boolean
  placeholder?: string
  step?: string
  hint?: string
  min?: number
  max?: number
}
export type ColumnDef = { label: string; key?: string; render?: (row: any, reload: () => void) => ReactNode; align?: 'right' | 'center'; csv?: (row: any) => string | number }

/** Loads dropdown options for `from` fields (e.g. project_id → projects.name). */
function useOptions(fields: FieldDef[]) {
  const { sb } = useApp()
  const [opts, setOpts] = useState<Record<string, Opt[]>>({})
  useEffect(() => {
    let live = true
    fields.filter(f => f.from).forEach(async f => {
      const { table, value = 'id', label, filter } = f.from!
      let q = sb.from(table).select(`${value}, ${label}`).order(label)
      Object.entries(filter || {}).forEach(([k, v]) => { q = q.eq(k, v) })
      const { data } = await q.limit(500)
      if (live) setOpts(o => ({ ...o, [f.name]: (data || []).map((r: any) => ({ value: r[value], label: r[label] })) }))
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb])
  return opts
}

function initialValues(fields: FieldDef[], row?: any) {
  const v: Record<string, any> = {}
  fields.forEach(f => {
    const raw = row ? row[f.name] : f.default
    if (f.type === 'checkbox') v[f.name] = !!raw
    else v[f.name] = raw === null || raw === undefined ? '' : f.type === 'date' ? String(raw).slice(0, 10) : raw
  })
  return v
}

function coerce(fields: FieldDef[], values: Record<string, any>) {
  const out: Record<string, any> = {}
  fields.forEach(f => {
    const raw = values[f.name]
    if (f.type === 'checkbox') out[f.name] = !!raw
    else if (f.type === 'number') out[f.name] = raw === '' || raw === null ? null : Number(raw)
    else out[f.name] = raw === '' || raw === undefined ? null : typeof raw === 'string' ? raw.trim() : raw
  })
  return out
}

export function FormModal({ title, fields, initial, onSubmit, onClose, submitLabel = 'Save' }: {
  title: string; fields: FieldDef[]; initial?: any; onSubmit: (values: any) => Promise<boolean | void>; onClose: () => void; submitLabel?: string
}) {
  const opts = useOptions(fields)
  const [values, setValues] = useState(() => initialValues(fields, initial))
  const [saving, setSaving] = useState(false)
  const set = (name: string, v: any) => setValues(s => ({ ...s, [name]: v }))

  const submit = async () => {
    const missing = fields.find(f => f.required && (values[f.name] === '' || values[f.name] === null || values[f.name] === undefined))
    if (missing) { toast.error(`${missing.label} is required`); return }
    setSaving(true)
    try {
      const ok = await onSubmit(coerce(fields, values))
      if (ok !== false) onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={title} onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={submit} loading={saving}>{submitLabel}</Btn></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(f => {
          const common = { id: f.name, className: inputCls, value: values[f.name] ?? '', placeholder: f.placeholder }
          const options = f.options || opts[f.name] || []
          return (
            <div key={f.name} className={f.full || f.type === 'textarea' ? 'sm:col-span-2' : ''}>
              {f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 pt-5 text-sm text-slate-700">
                  <input type="checkbox" checked={!!values[f.name]} onChange={e => set(f.name, e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  {f.label}
                </label>
              ) : (
                <>
                  <Label hint={f.required ? '*' : f.hint}>{f.label}</Label>
                  {f.type === 'select' ? (
                    <select {...common} onChange={e => set(f.name, e.target.value)}>
                      <option value="">{f.required ? 'Select…' : '— None —'}</option>
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea {...common} rows={3} onChange={e => set(f.name, e.target.value)} />
                  ) : (
                    <input {...common} type={f.type || 'text'} step={f.step} min={f.min} max={f.max} onChange={e => set(f.name, e.target.value)} />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

type Props = {
  table: string
  select?: string
  columns: ColumnDef[]
  fields: FieldDef[]
  order?: { column: string; ascending?: boolean }
  writeRoles: Role[]
  editRoles?: Role[]
  deleteRoles?: Role[]
  projectFilter?: boolean
  statusFilter?: { column: string; options: Opt[]; label?: string }
  dateFilter?: string
  rowActions?: (row: any, reload: () => void) => ReactNode
  summary?: (rows: any[], reload: () => void) => ReactNode
  toolbar?: (reload: () => void) => ReactNode
  addLabel?: string
  noEdit?: boolean
  noDelete?: boolean
  beforeSave?: (values: any, ctx: { editing: any | null; sb: any; role: Role; companyId: string }) => Promise<any> | any
  emptyTitle?: string
  emptyHint?: string
  exportName?: string
  rowFilter?: (row: any) => boolean
  searchPlaceholder?: string
  onChanged?: () => void
}

const PER_PAGE = 15
const rowCache = new Map<string, any[]>()   // stale-while-revalidate across page visits
const cacheKey = (t: string, s: string | undefined, ...f: string[]) => [t, s || '*', ...f].join('|')

export default function DataModule(p: Props) {
  const { sb, role, companyId } = useApp()
  const [rows, setRows] = useState<any[]>(() => rowCache.get(cacheKey(p.table, p.select, '', '', '', '')) || [])
  const [loading, setLoading] = useState(() => !rowCache.has(cacheKey(p.table, p.select, '', '', '', '')))
  const [q, setQ] = useState('')
  const [project, setProject] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState<Opt[]>([])
  const [modal, setModal] = useState<{ row: any | null } | null>(null)

  const canAdd = p.writeRoles.includes(role)
  const canEdit = !p.noEdit && (p.editRoles || p.writeRoles).includes(role)
  const canDelete = !p.noDelete && (p.deleteRoles || MANAGERS).includes(role)

  useEffect(() => {
    if (!p.projectFilter) return
    sb.from('projects').select('id, name').order('name').then(({ data }: any) => setProjects((data || []).map((r: any) => ({ value: r.id, label: r.name }))))
  }, [sb, p.projectFilter])

  const load = useCallback(async () => {
    const ck = cacheKey(p.table, p.select, project, status, from, to)
    const hit = rowCache.get(ck)
    if (hit) { setRows(hit); setLoading(false) } else setLoading(true)
    let query = sb.from(p.table).select(p.select || '*')
    if (p.projectFilter && project) query = query.eq('project_id', project)
    if (p.statusFilter && status) query = query.eq(p.statusFilter.column, status)
    if (p.dateFilter && from) query = query.gte(p.dateFilter, from)
    if (p.dateFilter && to) query = query.lte(p.dateFilter, to)
    const o = p.order || { column: 'created_at', ascending: false }
    const { data, error } = await query.order(o.column, { ascending: o.ascending ?? false }).limit(1000)
    if (error) toast.error(error.message)
    rowCache.set(ck, data || [])
    setRows(data || [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, p.table, p.select, project, status, from, to])

  useEffect(() => { load() }, [load])
  useEffect(() => setPage(1), [q, project, status, from, to])

  const reloadAll = useCallback(() => { load(); p.onChanged?.() }, [load, p])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(r => (!p.rowFilter || p.rowFilter(r)) && (!needle || JSON.stringify(r).toLowerCase().includes(needle)))
  }, [rows, q, p])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const save = async (values: any) => {
    const editing = modal?.row || null
    const final = p.beforeSave ? await p.beforeSave(values, { editing, sb, role, companyId }) : values
    if (final === false) return false
    const { error } = editing
      ? await sb.from(p.table).update(final).eq('id', editing.id)
      : await sb.from(p.table).insert(final)
    if (error) { toast.error(error.message); return false }
    toast.success(editing ? 'Updated' : 'Added')
    reloadAll()
  }

  const remove = async (row: any) => {
    if (!confirm('Delete this record? This cannot be undone.')) return
    const { error } = await sb.from(p.table).delete().eq('id', row.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); reloadAll() }
  }

  const exportCsv = () => {
    const cols = p.columns.filter(c => c.key || c.csv)
    downloadCSV(p.exportName || p.table, cols.map(c => c.label), filtered.map(r => cols.map(c => (c.csv ? c.csv(r) : r[c.key!]))))
  }

  const showActions = canEdit || canDelete || !!p.rowActions

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={p.searchPlaceholder || 'Search…'} className={inputCls + ' pl-9'} />
        </div>
        {p.projectFilter && (
          <select value={project} onChange={e => setProject(e.target.value)} className={inputAuto + ' w-auto'}>
            <option value="">All projects</option>
            {projects.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {p.statusFilter && (
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputAuto + ' w-auto'}>
            <option value="">{p.statusFilter.label || 'All statuses'}</option>
            {p.statusFilter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {p.dateFilter && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputAuto + ' w-auto'} aria-label="From date" />
            –
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputAuto + ' w-auto'} aria-label="To date" />
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {p.toolbar?.(reloadAll)}
          <Btn variant="secondary" onClick={exportCsv} disabled={!filtered.length}><Download size={14} /> Export</Btn>
          {canAdd && <Btn onClick={() => setModal({ row: null })}><Plus size={15} /> {p.addLabel || 'Add'}</Btn>}
        </div>
      </div>

      {p.summary?.(filtered, reloadAll)}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <Empty title={p.emptyTitle || 'Nothing here yet'} hint={p.emptyHint || (canAdd ? `Use “${p.addLabel || 'Add'}” to create the first record.` : undefined)} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {p.columns.map(c => <th key={c.label} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>{c.label}</th>)}
                  {showActions && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    {p.columns.map(c => (
                      <td key={c.label} className={`px-4 py-2.5 text-slate-700 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}>
                        {c.render ? c.render(r, reloadAll) : (r[c.key!] ?? '—')}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.rowActions?.(r, reloadAll)}
                          {canEdit && <button onClick={() => setModal({ row: r })} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil size={14} /></button>}
                          {canDelete && <button onClick={() => remove(r)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <span>{filtered.length} records</span>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(x => x - 1)}>Prev</Btn>
                <span>{page} / {pageCount}</span>
                <Btn size="sm" variant="secondary" disabled={page === pageCount} onClick={() => setPage(x => x + 1)}>Next</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {modal && (
        <FormModal title={modal.row ? `Edit ${p.addLabel?.replace(/^Add |^New /, '') || 'record'}` : (p.addLabel || 'Add')}
          fields={p.fields} initial={modal.row} onClose={() => setModal(null)} onSubmit={save} />
      )}
    </div>
  )
}
