// Single source of truth for plans. The database copy lives in supabase/migrations/20260101000005_plans_and_billing.sql — keep both in sync.
export type Plan = 'starter' | 'growth' | 'business'
export type Feature = 'contractor_bills' | 'budgets' | 'ai_assistant' | 'csv_export' | 'advanced_reports' | 'audit_log'

export const PLAN_ORDER: Plan[] = ['starter', 'growth', 'business']
const MIN_PLAN: Record<Feature, Plan> = {
  contractor_bills: 'growth', budgets: 'growth', ai_assistant: 'growth', csv_export: 'growth', advanced_reports: 'growth', audit_log: 'business',
}
export const planAllows = (plan: Plan, f: Feature) => PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(MIN_PLAN[f])
export const minPlanFor = (f: Feature): Plan => MIN_PLAN[f]
export const PLAN_NAME: Record<Plan, string> = { starter: 'Starter', growth: 'Growth', business: 'Business' }

export const FEATURE_INFO: Record<Feature, { label: string; desc: string }> = {
  contractor_bills: { label: 'Contractor bills & approvals', desc: 'Record contractor bills with retention and deductions, route them for approval, track payments and outstanding balances.' },
  budgets: { label: 'Budgets, variance & revisions', desc: 'Set budgets by category, record approved budget revisions and see budget versus actual cost for every project.' },
  ai_assistant: { label: 'AI Site Assistant', desc: 'Ask questions about budgets, overdue tasks, stock, labour and pending bills and get answers from your own records.' },
  csv_export: { label: 'CSV export', desc: 'Export any list or report to CSV for Excel and sharing with clients or your accountant.' },
  advanced_reports: { label: 'All 12 reports', desc: 'Material consumption, purchases by supplier, contractor bills, budget vs actual, outstanding payments and delayed tasks.' },
  audit_log: { label: 'Audit log', desc: 'See who created, changed or deleted important records, and when.' },
}

/** Pages that are completely locked on lower plans. */
export const ROUTE_FEATURE: Record<string, Feature> = { '/app/contractors': 'contractor_bills', '/app/ai': 'ai_assistant' }
export const BASIC_REPORTS = ['progress', 'daily', 'attendance', 'labour_cost', 'stock', 'expenses']

export type PlanDef = {
  id: Plan; name: string; price: string; suffix: string; tagline: string; popular?: boolean
  projects: number | null; users: number | null; lead?: string; features: string[]
}
export const PLANS: PlanDef[] = [
  {
    id: 'starter', name: 'Starter', price: '₹4,999', suffix: '/month', tagline: 'For small contractors going digital', projects: 5, users: 5,
    features: [
      'Up to 5 projects and 5 team members', 'Daily site reports with photos and manager review', 'Tasks, milestones and deadlines',
      'Labour attendance and wage tracking', 'Materials, stock ledger and material requests', 'Purchase orders and supplier tracking',
      'Expense tracking by project and category', 'Documents and drawings in private storage', '6 core reports with print',
      'In-app notifications and role-based access', 'Email support',
    ],
  },
  {
    id: 'growth', name: 'Growth', price: '₹9,999', suffix: '/month', tagline: 'For builders running several sites', popular: true, projects: 25, users: 25, lead: 'Everything in Starter, plus:',
    features: [
      'Up to 25 projects and 25 team members', 'Contractor bills with approval workflow, retention and payments', 'Budgets, category budgets, revisions and variance',
      'All 12 reports and CSV export on every list', 'AI Site Assistant', 'Priority support on WhatsApp',
    ],
  },
  {
    id: 'business', name: 'Business', price: '₹19,999+', suffix: '/month', tagline: 'For larger companies that need more control', projects: null, users: null, lead: 'Everything in Growth, plus:',
    features: [
      'Unlimited projects and team members', 'Audit log: who changed what, and when', 'Custom workflows and reports, scoped with you',
      'Dedicated onboarding and team training', 'Priority support with a dedicated contact',
    ],
  },
]

export const lim = (n: number | null) => (n === null ? 'Unlimited' : String(n))
// values: [Starter, Growth, Business]
export const COMPARISON: { group: string; rows: { label: string; values: (boolean | string)[] }[] }[] = [
  { group: 'Capacity', rows: [
    { label: 'Projects', values: ['5', '25', 'Unlimited'] },
    { label: 'Team members', values: ['5', '25', 'Unlimited'] },
  ] },
  { group: 'Site operations', rows: [
    { label: 'Projects, sites and team assignment', values: [true, true, true] },
    { label: 'Daily site reports with photos and review', values: [true, true, true] },
    { label: 'Tasks and milestones', values: [true, true, true] },
    { label: 'Labour attendance and wage tracking', values: [true, true, true] },
    { label: 'Materials, stock ledger, requests and transfers', values: [true, true, true] },
    { label: 'Purchase orders and suppliers', values: [true, true, true] },
    { label: 'Documents and drawings', values: [true, true, true] },
  ] },
  { group: 'Finance', rows: [
    { label: 'Expense tracking', values: [true, true, true] },
    { label: 'Contractor bills, approvals and payments', values: [false, true, true] },
    { label: 'Budgets, revisions and variance', values: [false, true, true] },
  ] },
  { group: 'Insights', rows: [
    { label: 'Core reports (6) with print', values: [true, true, true] },
    { label: 'All 12 reports', values: [false, true, true] },
    { label: 'CSV export', values: [false, true, true] },
    { label: 'AI Site Assistant', values: [false, true, true] },
    { label: 'Audit log', values: [false, false, true] },
  ] },
  { group: 'Support', rows: [
    { label: 'Email support', values: [true, true, true] },
    { label: 'Priority WhatsApp support', values: [false, true, true] },
    { label: 'Dedicated onboarding and training', values: [false, false, true] },
    { label: 'Custom workflows and reports', values: [false, false, true] },
  ] },
]
export const SETUP_NOTE = 'Optional one-time onboarding & customisation: ₹30,000 – ₹75,000 depending on scope.'
