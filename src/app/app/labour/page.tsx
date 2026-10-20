'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import DataModule, { FieldDef } from '@/components/DataModule'
import { useApp } from '@/components/AppProvider'
import { Badge, Btn, Card, PageHeader, StatusBadge, Tabs } from '@/components/ui'
import { fmtDate, inr, todayISO } from '@/lib/format'
import { FINANCE } from '@/lib/permissions'
import { opt, TRADES } from '@/lib/fields'

const attFields: FieldDef[] = [
  { name: 'project_id', label: 'Project', type: 'select', required: true, from: { table: 'projects', label: 'name' } },
  { name: 'worker_id', label: 'Worker', type: 'select', required: true, from: { table: 'workers', label: 'name', filter: { active: true } } },
  { name: 'work_date', label: 'Date', type: 'date', required: true, default: todayISO() },
  { name: 'status', label: 'Status', type: 'select', options: opt('present', 'half_day', 'absent'), default: 'present' },
  { name: 'regular_hours', label: 'Regular hours', type: 'number', step: '0.5', default: 8, min: 0, max: 24 },
  { name: 'overtime_hours', label: 'Overtime hours', type: 'number', step: '0.5', default: 0, min: 0, max: 24 },
  { name: 'correction_reason', label: 'Reason (required when correcting a record)', type: 'textarea' },
]
const workerFields: FieldDef[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'category', label: 'Category', type: 'select', options: TRADES.map(t => ({ value: t, label: t })), default: 'Helper' },
  { name: 'daily_wage', label: 'Daily wage (₹)', type: 'number', required: true, min: 0, default: 0 },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'contractor_id', label: 'Contractor', type: 'select', from: { table: 'contractors', label: 'name' } },
  { name: 'active', label: 'Active', type: 'checkbox', default: true },
]

export default function Labour() {
  const { sb, can } = useApp()
  const [tab, setTab] = useState<'attendance' | 'workers'>('attendance')

  const payWages = async (reload: () => void) => {
    if (!confirm('Record wage payment for ALL unpaid attendance? This creates labour expenses and cannot be undone.')) return
    const { data, error } = await sb.rpc('pay_wages', { p_project: null })
    if (error) toast.error(error.message); else { toast.success(`Wage payment of ${inr(data, { compact: false })} recorded`); reload() }
  }

  return (
    <div>
      <PageHeader title="Labour & Attendance" subtitle="Attendance is payable wages — it becomes an expense only when payment is recorded" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'attendance', label: 'Attendance' }, { id: 'workers', label: 'Workers' }]} />
      {tab === 'attendance' ? (
        <DataModule table="attendance_records" addLabel="Add Attendance" fields={attFields} writeRoles={['owner', 'manager', 'engineer', 'accountant']}
          select="*, worker:workers(name, category), project:projects(name)" order={{ column: 'work_date', ascending: false }} projectFilter dateFilter="work_date"
          statusFilter={{ column: 'status', options: opt('present', 'half_day', 'absent') }} searchPlaceholder="Search worker…" exportName="attendance"
          beforeSave={(v, { editing }) => {
            if (editing && !v.correction_reason) { toast.error('Please give a reason for the correction'); return false }
            if (!editing) delete v.correction_reason
            return v
          }}
          summary={(rows, reload) => {
            const payable = rows.filter(r => !r.wage_paid).reduce((s, r) => s + Number(r.amount), 0)
            const paid = rows.filter(r => r.wage_paid).reduce((s, r) => s + Number(r.amount), 0)
            return (
              <Card className="mb-3 flex flex-wrap items-center gap-x-8 gap-y-2 p-4 text-sm">
                <div><div className="text-xs text-slate-500">Records</div><b>{rows.length}</b></div>
                <div><div className="text-xs text-slate-500">Payable (unpaid)</div><b className="text-amber-600">{inr(payable, { compact: false })}</b></div>
                <div><div className="text-xs text-slate-500">Paid</div><b className="text-emerald-600">{inr(paid, { compact: false })}</b></div>
                {can(FINANCE) && payable > 0 && <Btn className="ml-auto" variant="success" onClick={() => payWages(reload)}>Record wage payment</Btn>}
              </Card>)
          }}
          columns={[
            { label: 'Worker', render: r => <div><div className="font-medium text-slate-900">{r.worker?.name}</div><div className="text-xs text-slate-400">{r.worker?.category}</div></div>, csv: r => r.worker?.name },
            { label: 'Project', render: r => r.project?.name, csv: r => r.project?.name },
            { label: 'Date', key: 'work_date', render: r => fmtDate(r.work_date) },
            { label: 'Status', render: r => <StatusBadge status={r.status} />, csv: r => r.status },
            { label: 'Hours', render: r => `${r.regular_hours}${Number(r.overtime_hours) ? ` + ${r.overtime_hours} OT` : ''}`, csv: r => r.regular_hours },
            { label: 'Rate', key: 'wage_rate', align: 'right', render: r => inr(r.wage_rate, { compact: false }) },
            { label: 'Amount', key: 'amount', align: 'right', render: r => inr(r.amount, { compact: false }) },
            { label: 'Wages', render: r => <div className="flex gap-1">{r.wage_paid ? <Badge tone="blue">Paid</Badge> : <Badge tone="amber">Payable</Badge>}{r.is_corrected && <Badge tone="purple">Corrected</Badge>}</div>, csv: r => (r.wage_paid ? 'Paid' : 'Payable') },
          ]} />
      ) : (
        <DataModule table="workers" addLabel="Add Worker" fields={workerFields} writeRoles={['owner', 'manager', 'engineer', 'accountant']} select="*, contractor:contractors(name)"
          order={{ column: 'name', ascending: true }} searchPlaceholder="Search workers…"
          columns={[
            { label: 'Name', key: 'name', render: r => <b className="text-slate-900">{r.name}</b> }, { label: 'Category', key: 'category' },
            { label: 'Daily wage', key: 'daily_wage', align: 'right', render: r => inr(r.daily_wage, { compact: false }) },
            { label: 'Phone', key: 'phone' }, { label: 'Contractor', render: r => r.contractor?.name || '—', csv: r => r.contractor?.name || '' },
            { label: 'Status', render: r => (r.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>), csv: r => (r.active ? 'Active' : 'Inactive') },
          ]} />
      )}
    </div>
  )
}
