import { store, rowKey } from './store'
import { NAV, Role } from './permissions'
import { todayISO } from './format'
import type { Feature } from './plans'

export const SITE_REPORT_SELECT = '*, project:projects(name), creator:profiles!created_by(full_name), reviewer:profiles!reviewed_by(full_name)'

export async function fetchOverview(sb: any) {
  const today = todayISO()
  const [projects, expenses, revisions, reports, requests, bills, pendExp, attendance, tasks, pos] = await Promise.all([
    sb.from('projects').select('*').order('created_at'),
    sb.from('expenses').select('project_id, amount, expense_date').eq('kind', 'actual').eq('approval_status', 'approved'),
    sb.from('budget_revisions').select('project_id, change_amount'),
    sb.from('daily_site_reports').select('id, report_date, work_completed, status, project:projects(name)').order('report_date', { ascending: false }).limit(4),
    sb.from('material_requests').select('id, quantity, project_id, material:materials(name, unit), project:projects(name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
    sb.from('contractor_bills').select('id, bill_no, net_amount, project_id, contractor:contractors(name), project:projects(name)').eq('status', 'pending').limit(20),
    sb.from('expenses').select('id, amount, description, category, project_id, project:projects(name)').eq('approval_status', 'pending').limit(20),
    sb.from('attendance_records').select('id, status').eq('work_date', today),
    sb.from('tasks').select('id, due_date, status, project_id').neq('status', 'done').lt('due_date', today),
    sb.from('purchase_orders').select('project_id, amount, paid_amount, delivery_status'),
  ])
  return {
    projects: projects.data || [], expenses: expenses.data || [], revisions: revisions.data || [], reports: reports.data || [],
    requests: requests.data || [], bills: bills.data || [], pendExp: pendExp.data || [], attendance: attendance.data || [],
    overdue: tasks.data || [], pos: pos.data || [],
  }
}

export async function fetchProjectsList(sb: any) {
  const { data } = await sb.from('projects').select('*').order('created_at', { ascending: false })
  return data || []
}
export async function fetchSiteReports(sb: any) {
  const { data } = await sb.from('daily_site_reports').select(SITE_REPORT_SELECT).order('report_date', { ascending: false }).limit(300)
  return data || []
}
export async function fetchDocuments(sb: any) {
  const { data } = await sb.from('documents').select('*, project:projects(name)').order('created_at', { ascending: false }).limit(300)
  return data || []
}
export async function fetchStock(sb: any) {
  const [b, m, p] = await Promise.all([sb.from('stock_balances').select('*'), sb.from('materials').select('id, name, unit, min_stock, category'), sb.from('projects').select('id, name')])
  const mm = Object.fromEntries((m.data || []).map((x: any) => [x.id, x])); const pp = Object.fromEntries((p.data || []).map((x: any) => [x.id, x.name]))
  return (b.data || []).map((r: any) => ({ ...r, material: mm[r.material_id], site: pp[r.project_id], balance: Number(r.balance) })).filter((r: any) => r.material)
}
export async function fetchBudget(sb: any) {
  const [p, e, r, o, b] = await Promise.all([
    sb.from('projects').select('id, name, approved_budget'), sb.from('expenses').select('project_id, category, amount, kind, approval_status'),
    sb.from('budget_revisions').select('project_id, change_amount'), sb.from('purchase_orders').select('project_id, amount, paid_amount, delivery_status'), sb.from('budgets').select('project_id, category, amount'),
  ])
  return { p: p.data || [], e: e.data || [], r: r.data || [], o: o.data || [], b: b.data || [] }
}
export const defaultRange = () => { const x = new Date(); x.setMonth(x.getMonth() - 6); return { from: x.toISOString().slice(0, 10), to: todayISO() } }
export const reportsKey = (from: string, to: string) => `reports|${from}|${to}`
export async function fetchReports(sb: any, from: string, to: string) {
  const r = await Promise.all([
    sb.from('projects').select('*'), sb.from('expenses').select('*').eq('kind', 'actual').eq('approval_status', 'approved'),
    sb.from('attendance_records').select('*, worker:workers(name, category), project:projects(name)').gte('work_date', from).lte('work_date', to),
    sb.from('stock_movements').select('*, material:materials(name, unit), project:projects(name)').gte('movement_date', from).lte('movement_date', to),
    sb.from('stock_balances').select('*'), sb.from('materials').select('*'),
    sb.from('purchase_orders').select('*, supplier:suppliers(name), project:projects(name)').gte('order_date', from).lte('order_date', to),
    sb.from('contractor_bills').select('*, contractor:contractors(name), project:projects(name)').gte('bill_date', from).lte('bill_date', to),
    sb.from('tasks').select('*, project:projects(name), assignee:profiles!assignee_id(full_name)').neq('status', 'done'),
    sb.from('daily_site_reports').select('*, project:projects(name)').gte('report_date', from).lte('report_date', to),
    sb.from('budget_revisions').select('*'),
  ])
  const k = ['projects', 'expenses', 'attendance', 'movements', 'balances', 'materials', 'pos', 'bills', 'tasks', 'reports', 'revisions']
  return Object.fromEntries(k.map((key, i) => [key, r[i].data || []]))
}

// Tables behind every generic list page (must match the select/order used by each page's <DataModule>)
const L = (href: string, table: string, select: string | undefined, column: string, ascending: boolean, feature?: Feature) => ({ href, table, select, column, ascending, feature })
export const LIST_MODULES = [
  L('/app/tasks', 'tasks', '*, project:projects(name), assignee:profiles!assignee_id(full_name)', 'due_date', true),
  L('/app/labour', 'attendance_records', '*, worker:workers(name, category), project:projects(name)', 'work_date', false),
  L('/app/labour', 'workers', '*, contractor:contractors(name)', 'name', true),
  L('/app/materials', 'material_requests', '*, material:materials(name, unit), project:projects(name), requester:profiles!requested_by(full_name)', 'created_at', false),
  L('/app/materials', 'stock_movements', '*, material:materials(name, unit), project:projects(name), supplier:suppliers(name)', 'created_at', false),
  L('/app/materials', 'materials', undefined, 'name', true),
  L('/app/purchases', 'purchase_orders', '*, supplier:suppliers(name), project:projects(name), material:materials(name, unit)', 'order_date', false),
  L('/app/purchases', 'suppliers', undefined, 'name', true),
  L('/app/contractors', 'contractor_bills', '*, contractor:contractors(name), project:projects(name)', 'created_at', false, 'contractor_bills'),
  L('/app/contractors', 'contractors', undefined, 'name', true, 'contractor_bills'),
  L('/app/contractors', 'contractor_payments', '*, bill:contractor_bills(bill_no, contractor:contractors(name))', 'paid_on', false, 'contractor_bills'),
  L('/app/expenses', 'expenses', '*, project:projects(name)', 'expense_date', false),
  L('/app/expenses', 'budgets', '*, project:projects(name)', 'created_at', false, 'budgets'),
  L('/app/expenses', 'budget_revisions', '*, project:projects(name)', 'created_at', false, 'budgets'),
]

/** Warms the cache for every page the user can open, right after login, so clicks are instant. */
export async function prefetchAll(sb: any, role: Role, allows: (f: Feature) => boolean = () => true) {
  const allowed = (href: string) => !!NAV.find(n => n.href === href)?.roles.includes(role)
  const jobs: (() => Promise<void>)[] = []
  const add = (href: string, key: string, run: () => Promise<any>) => { if (allowed(href) && !store.has(key)) jobs.push(async () => { try { store.set(key, await run()) } catch { /* page will load it itself */ } }) }

  add('/app', 'overview', () => fetchOverview(sb))
  add('/app/projects', 'projects', () => fetchProjectsList(sb))
  add('/app/site-reports', 'site-reports', () => fetchSiteReports(sb))
  add('/app/documents', 'documents', () => fetchDocuments(sb))
  add('/app/materials', 'stock', () => fetchStock(sb))
  if (allows('budgets')) add('/app/expenses', 'budget', () => fetchBudget(sb))
  { const r = defaultRange(); add('/app/reports', reportsKey(r.from, r.to), () => fetchReports(sb, r.from, r.to)) }
  for (const m of LIST_MODULES) {
    if (m.feature && !allows(m.feature)) continue
    add(m.href, rowKey(m.table, m.select, '', '', '', ''), async () => {
      const { data } = await sb.from(m.table).select(m.select || '*').order(m.column, { ascending: m.ascending }).limit(1000)
      return data || []
    })
  }
  for (let i = 0; i < jobs.length; i += 6) await Promise.all(jobs.slice(i, i + 6).map(j => j()))   // small batches, first pages first
}
