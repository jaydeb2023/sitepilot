'use client'
import toast from 'react-hot-toast'
import DataModule, { FieldDef } from '@/components/DataModule'
import { useApp } from '@/components/AppProvider'
import { Btn, PageHeader, Progress, StatusBadge } from '@/components/ui'
import { fmtDate, todayISO } from '@/lib/format'
import { opt } from '@/lib/fields'

const fields: FieldDef[] = [
  { name: 'project_id', label: 'Project', type: 'select', required: true, from: { table: 'projects', label: 'name' } },
  { name: 'title', label: 'Title', required: true, full: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'assignee_id', label: 'Assigned to', type: 'select', from: { table: 'profiles', label: 'full_name' } },
  { name: 'priority', label: 'Priority', type: 'select', options: opt('low', 'medium', 'high'), default: 'medium' },
  { name: 'status', label: 'Status', type: 'select', options: opt('todo', 'in_progress', 'blocked', 'done'), default: 'todo' },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'progress', label: 'Progress %', type: 'number', min: 0, max: 100, default: 0 },
  { name: 'is_milestone', label: 'This is a milestone', type: 'checkbox' },
]

export default function Tasks() {
  const { sb } = useApp()
  const setStatus = async (id: string, status: string, reload: () => void) => {
    const { error } = await sb.from('tasks').update({ status, ...(status === 'done' ? { progress: 100 } : {}) }).eq('id', id)
    if (error) toast.error(error.message); else reload()
  }
  return (
    <div>
      <PageHeader title="Tasks & Milestones" subtitle="Assign work, set deadlines and track progress" />
      <DataModule table="tasks" addLabel="New Task" fields={fields} writeRoles={['owner', 'manager', 'engineer']} editRoles={['owner', 'manager', 'engineer', 'contractor']}
        select="*, project:projects(name), assignee:profiles!assignee_id(full_name)" order={{ column: 'due_date', ascending: true }}
        projectFilter statusFilter={{ column: 'status', options: opt('todo', 'in_progress', 'blocked', 'done') }} searchPlaceholder="Search tasks…"
        columns={[
          { label: 'Task', render: r => <div><div className="font-medium text-slate-900">{r.is_milestone && '◆ '}{r.title}</div><div className="text-xs text-slate-400">{r.project?.name}</div></div>, csv: r => r.title },
          { label: 'Assignee', render: r => r.assignee?.full_name || '—', csv: r => r.assignee?.full_name || '' },
          { label: 'Priority', render: r => <StatusBadge status={r.priority} /> },
          { label: 'Status', render: r => <StatusBadge status={r.status} /> },
          { label: 'Due', render: r => { const late = r.due_date && r.due_date < todayISO() && r.status !== 'done'; return <span className={late ? 'font-semibold text-red-600' : ''}>{fmtDate(r.due_date)}{late && ' · overdue'}</span> }, csv: r => r.due_date || '' },
          { label: 'Progress', render: r => <div className="flex w-24 items-center gap-2"><Progress value={r.progress} tone="green" /><span className="text-xs">{r.progress}%</span></div> },
        ]}
        rowActions={(r, reload) => r.status !== 'done' && <>
          <Btn size="sm" variant="success" onClick={() => setStatus(r.id, 'done', reload)}>Done</Btn>
          {r.status !== 'blocked' && <Btn size="sm" variant="secondary" onClick={() => setStatus(r.id, 'blocked', reload)}>Block</Btn>}
        </>} />
    </div>
  )
}
