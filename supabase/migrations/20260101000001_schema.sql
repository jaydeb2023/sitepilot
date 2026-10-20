-- ============================================================
-- SitePilot · Schema  (run 1 of 4)
-- Multi-tenant: every business table carries company_id.
-- ============================================================
create extension if not exists pgcrypto;

-- ── Tenancy ──────────────────────────────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'owner'
    check (role in ('owner','manager','engineer','storekeeper','accountant','contractor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_company_idx on public.profiles(company_id);

-- Helpers used as column defaults and inside RLS (security definer = no RLS recursion)
create or replace function public.current_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter','growth','business')),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  project_limit int not null default 10,
  user_limit int not null default 10,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager','engineer','storekeeper','accountant','contractor')),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_email_idx on public.invitations(lower(email));

-- Public lead capture from the marketing site
create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  company text check (char_length(company) <= 160),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 200),
  active_projects text check (char_length(active_projects) <= 40),
  message text check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);

-- ── Projects ─────────────────────────────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  code text,
  name text not null,
  project_type text not null default 'Residential',
  client_name text,
  site_address text,
  start_date date,
  target_date date,
  contract_value numeric(14,2) not null default 0,
  approved_budget numeric(14,2) not null default 0,
  manager_id uuid references public.profiles(id) on delete set null,
  status text not null default 'planning'
    check (status in ('planning','on_track','delayed','at_risk','completed')),
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);
create index projects_company_idx on public.projects(company_id);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  primary key (project_id, user_id)
);

create table public.project_sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  address text
);

-- Project-level access: owner/manager/accountant/storekeeper see every project,
-- engineers and contractors only the projects they are assigned to.
create or replace function public.can_access_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects p where p.id = pid and p.company_id = public.current_company_id())
     and (public.current_role_name() in ('owner','manager','accountant','storekeeper')
          or exists (select 1 from public.project_members m where m.project_id = pid and m.user_id = auth.uid()))
$$;

-- ── Tasks & milestones ───────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  due_date date,
  progress int not null default 0 check (progress between 0 and 100),
  is_milestone boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index tasks_project_idx on public.tasks(project_id);

-- ── Daily site reports ───────────────────────────────────────
create table public.daily_site_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  site_name text,
  report_date date not null default current_date,
  weather text,
  workers_present int not null default 0,
  workers_breakdown jsonb not null default '[]'::jsonb,
  work_completed text,
  materials_used jsonb not null default '[]'::jsonb,
  equipment_used text,
  issues text,
  safety_notes text,
  next_day_plan text,
  photo_paths text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted','approved','correction_requested')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index reports_project_date_idx on public.daily_site_reports(project_id, report_date desc);

-- ── Contractors, workers, attendance ─────────────────────────
create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  trade text,
  phone text,
  contract_amount numeric(14,2) not null default 0,
  agreed_rates text,
  created_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  category text not null default 'Helper',
  daily_wage numeric(10,2) not null default 0,
  phone text,
  contractor_id uuid references public.contractors(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  work_date date not null default current_date,
  status text not null default 'present' check (status in ('present','absent','half_day')),
  regular_hours numeric(4,1) not null default 8,
  overtime_hours numeric(4,1) not null default 0,
  wage_rate numeric(10,2),
  amount numeric(12,2) not null default 0,          -- payable (computed by trigger)
  wage_paid boolean not null default false,          -- true only when a payment is recorded
  wage_paid_at timestamptz,
  is_corrected boolean not null default false,
  correction_reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (worker_id, work_date)
);
create index attendance_project_date_idx on public.attendance_records(project_id, work_date);

-- ── Materials & stock ────────────────────────────────────────
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'nos',
  min_stock numeric(14,3) not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  gstin text,
  created_at timestamptz not null default now()
);

-- Immutable ledger: stock only changes by inserting a movement.
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,   -- the site holding the stock
  material_id uuid not null references public.materials(id) on delete cascade,
  movement_type text not null
    check (movement_type in ('opening','receipt','issue','transfer_in','transfer_out','adjustment_in','adjustment_out')),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(12,2),
  supplier_id uuid references public.suppliers(id) on delete set null,
  ref_id uuid,
  note text,
  movement_date date not null default current_date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_mov_idx on public.stock_movements(project_id, material_id);

create view public.stock_balances with (security_invoker = true) as
select company_id, project_id, material_id,
       sum(case when movement_type in ('opening','receipt','transfer_in','adjustment_in') then quantity else -quantity end) as balance
from public.stock_movements
group by company_id, project_id, material_id;

create table public.material_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  quantity numeric(14,3) not null check (quantity > 0),
  needed_by date,
  status text not null default 'pending' check (status in ('pending','approved','rejected','issued')),
  note text,
  requested_by uuid default auth.uid() references public.profiles(id) on delete set null,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Purchases ────────────────────────────────────────────────
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  po_number text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  project_id uuid not null references public.projects(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  quantity numeric(14,3),
  unit_cost numeric(12,2),
  order_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  delivery_status text not null default 'ordered' check (delivery_status in ('ordered','partial','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid')),
  paid_amount numeric(14,2) not null default 0,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── Contractor bills & payments ──────────────────────────────
create table public.contractor_bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  bill_no text,
  bill_date date not null default current_date,
  description text,
  gross_amount numeric(14,2) not null default 0,
  retention numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  net_amount numeric(14,2) generated always as (gross_amount - retention - deductions) stored,
  status text not null default 'pending' check (status in ('pending','approved','rejected','returned','paid')),
  version int not null default 1,
  paid_amount numeric(14,2) not null default 0,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.contractor_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  bill_id uuid not null references public.contractor_bills(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  reference text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── Expenses & budgets ───────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null default 'miscellaneous'
    check (category in ('labour','material','equipment','transport','contractor','miscellaneous')),
  kind text not null default 'actual' check (kind in ('actual','committed','estimate')),
  approval_status text not null default 'approved' check (approval_status in ('pending','approved','rejected')),
  amount numeric(14,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  description text,
  vendor text,
  source text,
  source_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index expenses_project_date_idx on public.expenses(project_id, expense_date);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null check (category in ('labour','material','equipment','transport','contractor','miscellaneous')),
  amount numeric(14,2) not null default 0,
  unique (project_id, category)
);

create table public.budget_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  change_amount numeric(14,2) not null,
  reason text,
  approved_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── Documents ────────────────────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  category text not null default 'other'
    check (category in ('drawing','photo','daily_report','purchase_order','bill','contract','certificate','other')),
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ── Notifications & audit ────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  roles text[] not null default '{owner,manager}',
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  kind text,
  link text,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index notifications_company_idx on public.notifications(company_id, created_at desc);

create table public.audit_logs (
  id bigserial primary key,
  company_id uuid not null,
  user_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_company_idx on public.audit_logs(company_id, created_at desc);
