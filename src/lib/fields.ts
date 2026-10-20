import type { FieldDef, Opt } from '@/components/DataModule'

export const opt = (...v: string[]): Opt[] => v.map(x => ({ value: x, label: x.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) }))

export const PROJECT_TYPES = ['Residential', 'Commercial', 'Infrastructure', 'Interior', 'Renovation']
export const EXPENSE_CATEGORIES = ['labour', 'material', 'equipment', 'transport', 'contractor', 'miscellaneous']
export const TRADES = ['Mason', 'Helper', 'Electrician', 'Plumber', 'Carpenter', 'Bar Bender', 'Painter', 'Supervisor']
export const UNITS = ['bag', 'kg', 'ton', 'cft', 'sqft', 'nos', 'pcs', 'ltr', 'm', 'bundle']

export const projectFields: FieldDef[] = [
  { name: 'name', label: 'Project name', required: true },
  { name: 'code', label: 'Project code' },
  { name: 'project_type', label: 'Type', type: 'select', options: PROJECT_TYPES.map(t => ({ value: t, label: t })), default: 'Residential' },
  { name: 'client_name', label: 'Client name' },
  { name: 'site_address', label: 'Site address', full: true },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'target_date', label: 'Target completion', type: 'date' },
  { name: 'contract_value', label: 'Contract value (₹)', type: 'number', default: 0, min: 0 },
  { name: 'approved_budget', label: 'Approved budget (₹)', type: 'number', default: 0, min: 0 },
  { name: 'manager_id', label: 'Project manager', type: 'select', from: { table: 'profiles', label: 'full_name' } },
  { name: 'status', label: 'Status', type: 'select', options: opt('planning', 'on_track', 'delayed', 'at_risk', 'completed'), default: 'planning' },
  { name: 'progress', label: 'Progress %', type: 'number', min: 0, max: 100, default: 0 },
]
