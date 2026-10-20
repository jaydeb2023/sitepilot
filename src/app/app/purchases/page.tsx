'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import DataModule, { FieldDef, FormModal } from '@/components/DataModule'
import { useApp } from '@/components/AppProvider'
import { Btn, PageHeader, StatusBadge, Tabs } from '@/components/ui'
import { fmtDate, inr, todayISO } from '@/lib/format'
import { FINANCE } from '@/lib/permissions'
import { opt } from '@/lib/fields'

const poFields: FieldDef[] = [
  { name: 'po_number', label: 'PO number' }, { name: 'order_date', label: 'Order date', type: 'date', default: todayISO() },
  { name: 'supplier_id', label: 'Supplier', type: 'select', from: { table: 'suppliers', label: 'name' } },
  { name: 'project_id', label: 'Deliver to project', type: 'select', required: true, from: { table: 'projects', label: 'name' } },
  { name: 'material_id', label: 'Material', type: 'select', from: { table: 'materials', label: 'name' } },
  { name: 'quantity', label: 'Quantity', type: 'number', min: 0, step: '0.001' }, { name: 'unit_cost', label: 'Unit cost (₹)', type: 'number', min: 0 },
  { name: 'amount', label: 'Total amount (₹)', type: 'number', min: 0, hint: '(auto = qty × cost if blank/0)', default: 0 },
  { name: 'delivery_status', label: 'Delivery', type: 'select', options: opt('ordered', 'partial', 'delivered', 'cancelled'), default: 'ordered' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]
const supFields: FieldDef[] = [
  { name: 'name', label: 'Supplier name', required: true }, { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'email', label: 'Email', type: 'email' },
  { name: 'gstin', label: 'GSTIN' }, { name: 'address', label: 'Address', type: 'textarea' },
]

export default function Purchases() {
  const { sb, can } = useApp()
  const [tab, setTab] = useState<'po' | 'suppliers'>('po')
  const [pay, setPay] = useState<any>(null)
  const [reload, setReload] = useState<() => void>(() => () => {})

  const receive = async (r: any, rl: () => void) => {
    const { error } = await sb.rpc('receive_po', { p_po: r.id })
    if (error) toast.error(error.message); else { toast.success('Goods received into site stock'); rl() }
  }
  return (
    <div>
      <PageHeader title="Purchases & Suppliers" subtitle="Orders are committed costs; a payment is what becomes an actual expense" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'po', label: 'Purchase Orders' }, { id: 'suppliers', label: 'Suppliers' }]} />
      {tab === 'po' ? (
        <DataModule table="purchase_orders" addLabel="New Purchase Order" fields={poFields} writeRoles={['owner', 'manager', 'storekeeper', 'accountant']}
          select="*, supplier:suppliers(name), project:projects(name), material:materials(name, unit)" projectFilter order={{ column: 'order_date', ascending: false }}
          statusFilter={{ column: 'delivery_status', options: opt('ordered', 'partial', 'delivered', 'cancelled'), label: 'All deliveries' }}
          columns={[
            { label: 'PO', render: r => <div><b className="text-slate-900">{r.po_number || '—'}</b><div className="text-xs text-slate-400">{fmtDate(r.order_date)}</div></div>, csv: r => r.po_number || '' },
            { label: 'Supplier', render: r => r.supplier?.name || '—', csv: r => r.supplier?.name || '' }, { label: 'Project', render: r => r.project?.name, csv: r => r.project?.name },
            { label: 'Item', render: r => r.material ? `${r.material.name} × ${r.quantity} ${r.material.unit}` : '—', csv: r => r.material?.name || '' },
            { label: 'Amount', align: 'right', render: r => inr(r.amount, { compact: false }), csv: r => r.amount },
            { label: 'Outstanding', align: 'right', render: r => inr(Number(r.amount) - Number(r.paid_amount), { compact: false }), csv: r => Number(r.amount) - Number(r.paid_amount) },
            { label: 'Delivery', render: r => <StatusBadge status={r.delivery_status} />, csv: r => r.delivery_status }, { label: 'Payment', render: r => <StatusBadge status={r.payment_status} />, csv: r => r.payment_status },
          ]}
          rowActions={(r, rl) => <>
            {r.delivery_status !== 'delivered' && r.delivery_status !== 'cancelled' && r.material_id && can(['owner', 'manager', 'storekeeper']) && <Btn size="sm" onClick={() => receive(r, rl)}>Receive</Btn>}
            {r.payment_status !== 'paid' && r.delivery_status !== 'cancelled' && can(FINANCE) && <Btn size="sm" variant="success" onClick={() => { setReload(() => rl); setPay(r) }}>Pay</Btn>}
          </>} />
      ) : (
        <DataModule table="suppliers" addLabel="Add Supplier" fields={supFields} writeRoles={['owner', 'manager', 'storekeeper', 'accountant']} order={{ column: 'name', ascending: true }}
          columns={[{ label: 'Supplier', key: 'name', render: r => <b className="text-slate-900">{r.name}</b> }, { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' }, { label: 'GSTIN', key: 'gstin' }]} />
      )}
      {pay && <FormModal title={`Record payment · ${pay.po_number || 'PO'}`} submitLabel="Record payment" onClose={() => setPay(null)}
        fields={[{ name: 'amount', label: `Amount (outstanding ${inr(Number(pay.amount) - Number(pay.paid_amount), { compact: false })})`, type: 'number', required: true, min: 0 }]}
        onSubmit={async v => {
          if (v.amount <= 0 || v.amount > Number(pay.amount) - Number(pay.paid_amount)) { toast.error('Enter an amount up to the outstanding balance'); return false }
          const { error } = await sb.from('purchase_orders').update({ paid_amount: Number(pay.paid_amount) + v.amount }).eq('id', pay.id)
          if (error) { toast.error(error.message); return false }
          toast.success('Payment recorded as an expense'); reload()
        }} />}
    </div>
  )
}
