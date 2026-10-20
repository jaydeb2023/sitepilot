/** Builds a compact, permission-aware snapshot of the user's records (RLS applies via the user's session). */
const iso = (d: Date) => d.toISOString().slice(0, 10)
const sum = (a: any[], f: (x: any) => number) => a.reduce((s, x) => s + f(x), 0)

export interface Ctx {
  as_of: string
  periods: { yesterday: string; labour_week: string; expenses: string }
  projects: { name: string; status: string; progress_pct: number; budget: number; actual: number; committed: number; over_budget: boolean; used_pct: number | null }[]
  overdue_tasks: { task: string; project?: string; due: string; status: string }[]
  low_stock: { material: string; site?: string; balance: number; minimum: number; unit: string }[]
  yesterday_reports: { project?: string; status: string; workers: number; work?: string; issues?: string }[]
  pending_bills: { bill: string; contractor?: string; project?: string; net: number }[]
  pending_material_requests: { material?: string; qty: number; unit?: string; project?: string }[]
  labour_this_week: { payable_total: number; unpaid: number }
}

export async function buildContext(sb: any): Promise<Ctx> {
  const now = new Date()
  const today = iso(now)
  const y = new Date(now); y.setDate(y.getDate() - 1)
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6)

  const [projects, expenses, revisions, pos, tasks, reps, balances, materials, bills, att, reqs] = await Promise.all([
    sb.from('projects').select('id, name, status, progress, approved_budget, target_date'),
    sb.from('expenses').select('project_id, amount').eq('kind', 'actual').eq('approval_status', 'approved'),
    sb.from('budget_revisions').select('project_id, change_amount'),
    sb.from('purchase_orders').select('project_id, amount, paid_amount, delivery_status'),
    sb.from('tasks').select('title, due_date, status, project:projects(name)').neq('status', 'done').lt('due_date', today),
    sb.from('daily_site_reports').select('report_date, status, workers_present, work_completed, issues, project:projects(name)').eq('report_date', iso(y)),
    sb.from('stock_balances').select('project_id, material_id, balance'),
    sb.from('materials').select('id, name, unit, min_stock'),
    sb.from('contractor_bills').select('bill_no, net_amount, status, contractor:contractors(name), project:projects(name)').eq('status', 'pending'),
    sb.from('attendance_records').select('amount, wage_paid, project_id, work_date').gte('work_date', iso(weekStart)).lte('work_date', today),
    sb.from('material_requests').select('quantity, material:materials(name, unit), project:projects(name)').eq('status', 'pending'),
  ])
  const P = projects.data || []
  const name = Object.fromEntries(P.map((p: any) => [p.id, p.name]))
  const mat = Object.fromEntries((materials.data || []).map((m: any) => [m.id, m]))

  return {
    as_of: today,
    periods: { yesterday: iso(y), labour_week: `${iso(weekStart)} to ${today}`, expenses: 'all recorded approved actual expenses to date' },
    projects: P.map((p: any) => {
      const budget = Number(p.approved_budget) + sum((revisions.data || []).filter((r: any) => r.project_id === p.id), r => Number(r.change_amount))
      const actual = sum((expenses.data || []).filter((e: any) => e.project_id === p.id), e => Number(e.amount))
      const committed = sum((pos.data || []).filter((o: any) => o.project_id === p.id && o.delivery_status !== 'cancelled'), o => Number(o.amount) - Number(o.paid_amount))
      return { name: p.name, status: p.status, progress_pct: p.progress, budget, actual, committed, over_budget: budget > 0 && actual > budget, used_pct: budget ? Math.round((actual / budget) * 100) : null }
    }),
    overdue_tasks: (tasks.data || []).map((t: any) => ({ task: t.title, project: t.project?.name, due: t.due_date, status: t.status })),
    low_stock: (balances.data || []).filter((b: any) => mat[b.material_id] && Number(mat[b.material_id].min_stock) > 0 && Number(b.balance) <= Number(mat[b.material_id].min_stock))
      .map((b: any) => ({ material: mat[b.material_id].name, site: name[b.project_id], balance: Number(b.balance), minimum: Number(mat[b.material_id].min_stock), unit: mat[b.material_id].unit })),
    yesterday_reports: (reps.data || []).map((r: any) => ({ project: r.project?.name, status: r.status, workers: r.workers_present, work: r.work_completed, issues: r.issues })),
    pending_bills: (bills.data || []).map((b: any) => ({ bill: b.bill_no, contractor: b.contractor?.name, project: b.project?.name, net: Number(b.net_amount) })),
    pending_material_requests: (reqs.data || []).map((r: any) => ({ material: r.material?.name, qty: Number(r.quantity), unit: r.material?.unit, project: r.project?.name })),
    labour_this_week: { payable_total: sum(att.data || [], a => Number(a.amount)), unpaid: sum((att.data || []).filter((a: any) => !a.wage_paid), a => Number(a.amount)) },
  }
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** Rule-based answers used when no ANTHROPIC_API_KEY is configured (or the API call fails). */
export function answerFromContext(question: string, c: Ctx): string {
  const q = question.toLowerCase()
  const head = (t: string) => `${t}\n_Based on your records as of ${c.as_of}._\n\n`
  if (/over.?budget|budget/.test(q)) {
    const over = c.projects.filter(p => p.over_budget)
    const near = c.projects.filter(p => !p.over_budget && (p.used_pct ?? 0) >= 85)
    return head('Budget status (recorded actual expenses vs current approved budget)') +
      (over.length ? `**Over budget:**\n${over.map(p => `- ${p.name}: ${inr(p.actual)} spent of ${inr(p.budget)} (${p.used_pct}%)`).join('\n')}\n\n` : 'No project is over budget.\n\n') +
      (near.length ? `**Above 85% of budget:**\n${near.map(p => `- ${p.name}: ${p.used_pct}%`).join('\n')}` : '')
  }
  if (/overdue|delayed|late/.test(q)) {
    return head('Overdue tasks') + (c.overdue_tasks.length ? c.overdue_tasks.map(t => `- ${t.task} (${t.project}) — due ${t.due}, ${t.status.replace('_', ' ')}`).join('\n') : 'No overdue tasks.')
  }
  if (/yesterday|site report/.test(q)) {
    return head(`Site reports for ${c.periods.yesterday}`) + (c.yesterday_reports.length ? c.yesterday_reports.map(r => `- **${r.project}** (${r.workers} workers, ${r.status}): ${r.work || '—'}${r.issues ? ` _Issue: ${r.issues}_` : ''}`).join('\n') : 'No site reports were submitted for yesterday.')
  }
  if (/stock|material|low|running/.test(q)) {
    return head('Materials at or below minimum stock') + (c.low_stock.length ? c.low_stock.map(m => `- ${m.material} at ${m.site}: ${m.balance} ${m.unit} (minimum ${m.minimum})`).join('\n') : 'No materials are below their minimum level.')
  }
  if (/labou?r|wage|attendance/.test(q)) {
    return head(`Labour recorded ${c.periods.labour_week}`) + `Payable wages: ${inr(c.labour_this_week.payable_total)}\nStill unpaid: ${inr(c.labour_this_week.unpaid)}\n\n_Attendance is payable wages, not a payment, until a wage payment is recorded._`
  }
  if (/bill|contractor|approval|pending/.test(q)) {
    return head('Pending approvals') + `**Contractor bills awaiting approval (${c.pending_bills.length}):**\n` + (c.pending_bills.map(b => `- ${b.bill} · ${b.contractor} · ${b.project} · ${inr(b.net)}`).join('\n') || 'None') +
      `\n\n**Material requests pending (${c.pending_material_requests.length}):**\n` + (c.pending_material_requests.map(r => `- ${r.material} × ${r.qty} ${r.unit} · ${r.project}`).join('\n') || 'None')
  }
  return head('Portfolio summary') + c.projects.map(p => `- ${p.name}: ${p.status.replace('_', ' ')}, ${p.progress_pct}% complete, ${p.used_pct ?? 0}% of budget used`).join('\n') +
    '\n\nTry asking: which projects are over budget, which sites have overdue tasks, summarize yesterday\'s reports, which materials are running low, labour cost this week, or which bills are pending.'
}
