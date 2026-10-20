export type Role = 'owner' | 'manager' | 'engineer' | 'storekeeper' | 'accountant' | 'contractor'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Business Owner', manager: 'Project Manager', engineer: 'Site Engineer',
  storekeeper: 'Storekeeper', accountant: 'Accountant', contractor: 'Contractor / Supervisor',
}

const ALL: Role[] = ['owner', 'manager', 'engineer', 'storekeeper', 'accountant', 'contractor']

/** Which roles can open which section. The database enforces the same rules with RLS. */
export const NAV = [
  { href: '/app', label: 'Overview', icon: 'LayoutDashboard', roles: ALL },
  { href: '/app/projects', label: 'Projects', icon: 'Building2', roles: ALL },
  { href: '/app/site-reports', label: 'Site Reports', icon: 'ClipboardList', roles: ['owner', 'manager', 'engineer', 'contractor'] as Role[] },
  { href: '/app/tasks', label: 'Tasks', icon: 'ListChecks', roles: ALL },
  { href: '/app/labour', label: 'Labour', icon: 'HardHat', roles: ['owner', 'manager', 'engineer', 'accountant'] as Role[] },
  { href: '/app/materials', label: 'Materials', icon: 'Package', roles: ['owner', 'manager', 'engineer', 'storekeeper'] as Role[] },
  { href: '/app/purchases', label: 'Purchases', icon: 'ShoppingCart', roles: ['owner', 'manager', 'storekeeper', 'accountant'] as Role[] },
  { href: '/app/contractors', label: 'Contractors', icon: 'Users', roles: ['owner', 'manager', 'accountant', 'contractor'] as Role[] },
  { href: '/app/expenses', label: 'Expenses', icon: 'Wallet', roles: ['owner', 'manager', 'accountant'] as Role[] },
  { href: '/app/documents', label: 'Documents', icon: 'FolderOpen', roles: ALL },
  { href: '/app/reports', label: 'Reports', icon: 'BarChart3', roles: ['owner', 'manager', 'accountant'] as Role[] },
  { href: '/app/ai', label: 'AI Assistant', icon: 'Sparkles', roles: ['owner', 'manager', 'engineer', 'storekeeper', 'accountant'] as Role[] },
  { href: '/app/settings', label: 'Settings', icon: 'Settings', roles: ALL },
]

export const FINANCE: Role[] = ['owner', 'manager', 'accountant']
export const MANAGERS: Role[] = ['owner', 'manager']
