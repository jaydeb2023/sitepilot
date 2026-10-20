'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import DataModule, { FieldDef, FormModal } from '@/components/DataModule'
import { useApp } from '@/components/AppProvider'
import { Btn, PageHeader, StatusBadge, Tabs } from '@/components/ui'
import { fmtDate, inr, todayISO } from '@/lib/format'
import { FINANCE, MANAGERS } from '@/lib/permissions'
import { opt } from '@/lib/fields'

const billFields: FieldDef[] = [
  { name: 'bill_no', label: 'Bill no.', required: true }, { name: 'bill_date', label: 'Bill date', type: 'date', default: todayISO() },
  { name: 'contractor_id', label: 'Contractor', type: 'select', required: true, from: { table: 'contractors', label: 'name' } },
  { name: 'project_id', label: 'Project', type: 'select', required: true, from: { table: 'projects', label: 'name' } },
  { name: 'description', label: 'Work description / measurement', type: 'textarea' },
  { name: 'gross_amount', label: 'Gross amount (₹)', type: 'number', required: true, min: 0, default: 0 },
  { name: 'retention', label: 'Retention (₹)', type: 'number', min: 0, default: 0 }, { name: 'deductions', label: 'Other deductions (₹)', type: 'number', min: 0, default: 0 },
]
const conFields: FieldDef[] = [
  { name: 'name', label: 'Contractor name', required: true }, { name: 'trade', label: 'Trade / work type' }, { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'contract_amount', label: 'Contract amount (₹)', type: 'number', min: 0, default: 0 }, { name: 'agreed_rates', label: 'Agreed rates', type: 'textarea' },
]

export default function Contractors() {
  const { sb, can } = useApp()
  const [tab, setTab] = useState<'bills' | 'contractors' | 'payments'>('bills')
  const [pay, setPay] = useState<any>(null)
  const [reload, setReload] = useState<() => void>(() => () => {})
  const setStatus = async (id: string, status: string, rl: () => void) => {
    const { error } = await sb.from('contractor_bills').update({ status }).eq('id', id)
    if (error) toast.error(error.message); else rl()
  }
  return (
    <div>
      <PageHeader title="Contractors & Bills" subtitle="Bills are reviewed by managers; payments are recorded by finance" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'bills', label: 'Bills' }, { id: 'contractors', label: 'Contractors' }, { id: 'payments', label: 'Payments' }]} />
      {tab === 'bills' && (
        <DataModule table="contractor_bills" addLabel="New Bill" fields={billFields} writeRoles={['owner', 'manager', 'accountant', 'contractor']} editRoles={['owner', 'manager', 'accountant']}
          select="*, contractor:contractors(name), project:projects(name)" projectFilter statusFilter={{ column: 'status', options: opt('pending', 'approved', 'rejected', 'returned', 'paid') }}
          columns={[
            { label: 'Bill', render: r => <div><b className="text-slate-900">{r.bill_no}</b><div className="text-xs text-slate-400">{fmtDate(r.bill_date)} · v{r.version}</div></div>, csv: r => r.bill_no },
            { label: 'Contractor', render: r => r.contractor?.name, csv: r => r.contractor?.name }, { label: 'Project', render: r => r.project?.name, csv: r => r.project?.name },
            { label: 'Net amount', align: 'right', render: r => inr(r.net_amount, { compact: false }), csv: r => r.net_amount },
            { label: 'Paid', align: 'right', render: r => inr(r.paid_amount, { compact: false }), csv: r => r.paid_amount },
            { label: 'Balance', align: 'right', render: r => <b className={Number(r.net_amount) - Number(r.paid_amount) > 0 ? 'text-amber-600' : 'text-emerald-600'}>{inr(Number(r.net_amount) - Number(r.paid_amount), { compact: false })}</b>, csv: r => Number(r.net_amount) - Number(r.paid_amount) },
            { label: 'Status', render: r => <StatusBadge status={r.status} />, csv: r => r.status },
          ]}
          rowActions={(r, rl) => <>
            {r.status === 'pending' && can(MANAGERS) && <><Btn size="sm" variant="success" onClick={() => setStatus(r.id, 'approved', rl)}>Approve</Btn><Btn size="sm" variant="secondary" onClick={() => setStatus(r.id, 'returned', rl)}>Return</Btn><Btn size="sm" variant="danger" onClick={() => setStatus(r.id, 'rejected', rl)}>Reject</Btn></>}
            {r.status === 'approved' && Number(r.paid_amount) === 0 && can(MANAGERS) && <Btn size="sm" variant="secondary" onClick={() => setStatus(r.id, 'returned', rl)}>Return</Btn>}
            {r.status === 'approved' && can(FINANCE) && <Btn size="sm" onClick={() => { setReload(() => rl); setPay(r) }}>Pay</Btn>}
          </>} />)}
      {tab === 'contractors' && (
        <DataModule table="contractors" addLabel="Add Contractor" fields={conFields} writeRoles={['owner', 'manager', 'accountant']} order={{ column: 'name', ascending: true }}
          columns={[{ label: 'Contractor', key: 'name', render: r => <b className="text-slate-900">{r.name}</b> }, { label: 'Trade', key: 'trade' }, { label: 'Phone', key: 'phone' },
            { label: 'Contract amount', key: 'contract_amount', align: 'right', render: r => inr(r.contract_amount, { compact: false }) }, { label: 'Agreed rates', key: 'agreed_rates' }]} />)}
      {tab === 'payments' && (
        <DataModule table="contractor_payments" writeRoles={[]} noEdit noDelete fields={[]} select="*, bill:contractor_bills(bill_no, contractor:contractors(name))" order={{ column: 'paid_on', ascending: false }} projectFilter={false}
          emptyHint="Payments appear here once a bill payment is recorded." columns={[
            { label: 'Date', render: r => fmtDate(r.paid_on), csv: r => r.paid_on }, { label: 'Bill', render: r => r.bill?.bill_no, csv: r => r.bill?.bill_no },
            { label: 'Contractor', render: r => r.bill?.contractor?.name, csv: r => r.bill?.contractor?.name }, { label: 'Amount', align: 'right', render: r => inr(r.amount, { compact: false }), csv: r => r.amount },
            { label: 'Method', key: 'method' }, { label: 'Reference', key: 'reference' }]} />)}
      {pay && <FormModal title={`Record payment · ${pay.bill_no}`} submitLabel="Record payment" onClose={() => setPay(null)}
        fields={[{ name: 'amount', label: `Amount (balance ${inr(Number(pay.net_amount) - Number(pay.paid_amount), { compact: false })})`, type: 'number', required: true, min: 0 },
          { name: 'paid_on', label: 'Paid on', type: 'date', default: todayISO() }, { name: 'method', label: 'Method', type: 'select', options: ['Bank transfer', 'UPI', 'Cheque', 'Cash'].map(x => ({ value: x, label: x })) }, { name: 'reference', label: 'Reference / UTR' }]}
        onSubmit={async v => {
          const { error } = await sb.from('contractor_payments').insert({ ...v, bill_id: pay.id })
          if (error) { toast.error(error.message); return false }
          toast.success('Payment recorded'); reload()
        }} />}
    </div>
  )
}
