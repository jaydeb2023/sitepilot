'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeftRight } from 'lucide-react'
import DataModule, { FieldDef, FormModal } from '@/components/DataModule'
import { useApp } from '@/components/AppProvider'
import { inputAuto, Badge, Btn, Card, Empty, inputCls, PageHeader, Spinner, StatusBadge, Tabs } from '@/components/ui'
import { fmtDate, todayISO } from '@/lib/format'
import { MANAGERS } from '@/lib/permissions'
import { store } from '@/lib/store'
import { fetchStock } from '@/lib/prefetch'
import { opt, UNITS } from '@/lib/fields'

const proj = { table: 'projects', label: 'name' }
const mat = { table: 'materials', label: 'name' }

function StockBalance() {
  const { sb } = useApp()
  const [rows, setRows] = useState<any[] | null>(store.get('stock') ?? null)
  const [project, setProject] = useState('')
  const [q, setQ] = useState('')
  const load = useCallback(async () => {
    const r = await fetchStock(sb)
    store.set('stock', r)
    setRows(r)
  }, [sb])
  useEffect(() => { load() }, [load])
  const projects = useMemo(() => Array.from(new Set((rows || []).map(r => r.project_id))).map(id => ({ id, name: rows!.find(r => r.project_id === id).site })), [rows])
  if (!rows) return <Spinner />
  const list = rows.filter(r => (!project || r.project_id === project) && (!q || r.material.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.material.name.localeCompare(b.material.name))
  const statusOf = (r: any) => r.balance <= 0 ? 'out' : r.balance <= Number(r.material.min_stock) ? 'low_stock' : 'ok'
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2"><input className={inputAuto + ' w-56'} placeholder="Search material…" value={q} onChange={e => setQ(e.target.value)} />
        <select className={inputAuto + ' w-auto'} value={project} onChange={e => setProject(e.target.value)}><option value="">All sites</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      {list.length === 0 ? <Empty title="No stock recorded" hint="Record an opening stock or a receipt in the Movements tab." /> : (
        <Card className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {['Material', 'Site', 'Unit', 'Stock', 'Reorder level', 'Status'].map(h => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody>{list.map(r => { const s = statusOf(r); return (
            <tr key={r.project_id + r.material_id} className="border-b border-slate-50 last:border-0"><td className="px-4 py-2.5 font-medium text-slate-900">{r.material.name}</td><td className="px-4 py-2.5">{r.site}</td><td className="px-4 py-2.5">{r.material.unit}</td>
              <td className="px-4 py-2.5 font-semibold">{r.balance.toLocaleString('en-IN')}</td><td className="px-4 py-2.5">{Number(r.material.min_stock).toLocaleString('en-IN')}</td>
              <td className="px-4 py-2.5">{s === 'ok' ? <Badge tone="green">OK</Badge> : s === 'low_stock' ? <Badge tone="amber">Low</Badge> : <Badge tone="red">Out</Badge>}</td></tr>) })}</tbody></table></Card>)}
    </div>)
}

export default function Materials() {
  const { sb, can, role } = useApp()
  const [tab, setTab] = useState<'stock' | 'requests' | 'movements' | 'catalogue'>('stock')
  const [transfer, setTransfer] = useState(false)
  const [key, setKey] = useState(0)

  const decide = async (id: string, status: string, reload: () => void) => {
    const { error } = await sb.from('material_requests').update({ status }).eq('id', id)
    if (error) toast.error(error.message); else reload()
  }
  const issue = async (r: any, reload: () => void) => {
    const { error } = await sb.from('stock_movements').insert({ project_id: r.project_id, material_id: r.material_id, movement_type: 'issue', quantity: r.quantity, ref_id: r.id, note: 'Issued against material request' })
    if (error) return toast.error(error.message)
    await decide(r.id, 'issued', reload); toast.success('Materials issued and stock updated')
  }

  const reqFields: FieldDef[] = [
    { name: 'project_id', label: 'Site / Project', type: 'select', required: true, from: proj },
    { name: 'material_id', label: 'Material', type: 'select', required: true, from: mat },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0, step: '0.001' },
    { name: 'needed_by', label: 'Needed by', type: 'date' },
    { name: 'note', label: 'Note', type: 'textarea' },
  ]
  const movFields: FieldDef[] = [
    { name: 'project_id', label: 'Site / Project', type: 'select', required: true, from: proj },
    { name: 'material_id', label: 'Material', type: 'select', required: true, from: mat },
    { name: 'movement_type', label: 'Type', type: 'select', required: true, options: opt('opening', 'receipt', 'issue', 'adjustment_in', 'adjustment_out'), default: 'receipt' },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0, step: '0.001' },
    { name: 'unit_cost', label: 'Unit cost (₹)', type: 'number', min: 0 },
    { name: 'supplier_id', label: 'Supplier', type: 'select', from: { table: 'suppliers', label: 'name' } },
    { name: 'movement_date', label: 'Date', type: 'date', default: todayISO() },
    { name: 'note', label: 'Note', type: 'textarea' },
  ]
  const matFields: FieldDef[] = [
    { name: 'name', label: 'Material name', required: true }, { name: 'category', label: 'Category' },
    { name: 'unit', label: 'Unit', type: 'select', options: UNITS.map(u => ({ value: u, label: u })), default: 'nos' },
    { name: 'min_stock', label: 'Minimum stock (alert level)', type: 'number', min: 0, default: 0, step: '0.001' },
  ]
  const trFields: FieldDef[] = [
    { name: 'p_from', label: 'From site', type: 'select', required: true, from: proj }, { name: 'p_to', label: 'To site', type: 'select', required: true, from: proj },
    { name: 'p_material', label: 'Material', type: 'select', required: true, from: mat },
    { name: 'p_qty', label: 'Quantity', type: 'number', required: true, min: 0, step: '0.001' }, { name: 'p_note', label: 'Note', type: 'textarea' },
  ]

  return (
    <div>
      <PageHeader title="Materials & Inventory" subtitle="Every stock change is a recorded transaction" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'Stock Balance' }, { id: 'requests', label: 'Material Requests' }, { id: 'movements', label: 'Movements' }, { id: 'catalogue', label: 'Catalogue' }]} />
      {tab === 'stock' && <StockBalance key={key} />}
      {tab === 'requests' && (
        <DataModule table="material_requests" addLabel="New Request" fields={reqFields} writeRoles={['owner', 'manager', 'engineer', 'storekeeper']} noEdit noDelete={!can(MANAGERS)}
          select="*, material:materials(name, unit), project:projects(name), requester:profiles!requested_by(full_name)" projectFilter
          statusFilter={{ column: 'status', options: opt('pending', 'approved', 'rejected', 'issued') }}
          columns={[
            { label: 'Material', render: r => <b className="text-slate-900">{r.material?.name}</b>, csv: r => r.material?.name },
            { label: 'Qty', render: r => `${Number(r.quantity).toLocaleString('en-IN')} ${r.material?.unit || ''}`, csv: r => r.quantity },
            { label: 'Project', render: r => r.project?.name, csv: r => r.project?.name }, { label: 'Requested by', render: r => r.requester?.full_name || '—', csv: r => r.requester?.full_name || '' },
            { label: 'Needed by', render: r => fmtDate(r.needed_by), csv: r => r.needed_by || '' }, { label: 'Status', render: r => <StatusBadge status={r.status} />, csv: r => r.status },
          ]}
          rowActions={(r, reload) => <>
            {r.status === 'pending' && can(MANAGERS) && <><Btn size="sm" variant="success" onClick={() => decide(r.id, 'approved', reload)}>Approve</Btn><Btn size="sm" variant="danger" onClick={() => decide(r.id, 'rejected', reload)}>Reject</Btn></>}
            {r.status === 'approved' && can(['owner', 'manager', 'storekeeper']) && <Btn size="sm" onClick={() => issue(r, reload)}>Issue</Btn>}
          </>} />)}
      {tab === 'movements' && (
        <DataModule table="stock_movements" addLabel="Record Movement" fields={movFields} writeRoles={['owner', 'manager', 'storekeeper']} noEdit noDelete onChanged={() => setKey(k => k + 1)}
          select="*, material:materials(name, unit), project:projects(name), supplier:suppliers(name)" projectFilter dateFilter="movement_date" order={{ column: 'created_at', ascending: false }}
          toolbar={() => can(['owner', 'manager', 'storekeeper']) && <Btn variant="secondary" onClick={() => setTransfer(true)}><ArrowLeftRight size={14} /> Transfer</Btn>}
          emptyHint="Stock entries are permanent. Fix mistakes with an adjustment entry."
          columns={[
            { label: 'Date', render: r => fmtDate(r.movement_date), csv: r => r.movement_date }, { label: 'Material', render: r => r.material?.name, csv: r => r.material?.name },
            { label: 'Site', render: r => r.project?.name, csv: r => r.project?.name }, { label: 'Type', render: r => <StatusBadge status={r.movement_type} />, csv: r => r.movement_type },
            { label: 'Qty', align: 'right', render: r => `${Number(r.quantity).toLocaleString('en-IN')} ${r.material?.unit || ''}`, csv: r => r.quantity },
            { label: 'Supplier', render: r => r.supplier?.name || '—', csv: r => r.supplier?.name || '' }, { label: 'Note', key: 'note' },
          ]} />)}
      {tab === 'catalogue' && (
        <DataModule table="materials" addLabel="Add Material" fields={matFields} writeRoles={['owner', 'manager', 'storekeeper']} order={{ column: 'name', ascending: true }}
          columns={[{ label: 'Material', key: 'name', render: r => <b className="text-slate-900">{r.name}</b> }, { label: 'Category', key: 'category' }, { label: 'Unit', key: 'unit' }, { label: 'Minimum stock', key: 'min_stock', align: 'right' }]} />)}
      {transfer && <FormModal title="Transfer stock between sites" fields={trFields} submitLabel="Transfer" onClose={() => setTransfer(false)}
        onSubmit={async v => { const { error } = await sb.rpc('transfer_stock', v); if (error) { toast.error(error.message); return false } toast.success('Stock transferred'); setKey(k => k + 1) }} />}
    </div>
  )
}
