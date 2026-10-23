-- ============================================================
-- SitePilot · Plans, feature access & subscription lifecycle (run 5 of 5)
-- Safe to run on a database that already has migrations 1-4.
-- Keep the plan catalogue below in sync with src/lib/plans.ts
-- ============================================================

-- ── Plan catalogue ───────────────────────────────────────────
create or replace function public.plan_project_limit(p text) returns int language sql immutable as $$
  select case p when 'starter' then 5 when 'growth' then 25 else 9999 end $$;
create or replace function public.plan_user_limit(p text) returns int language sql immutable as $$
  select case p when 'starter' then 5 when 'growth' then 25 else 9999 end $$;

create or replace function public.plan_allows(p text, f text) returns boolean language sql immutable as $$
  select case f
    when 'contractor_bills'  then p in ('growth','business')
    when 'budgets'           then p in ('growth','business')
    when 'ai_assistant'      then p in ('growth','business')
    when 'csv_export'        then p in ('growth','business')
    when 'advanced_reports'  then p in ('growth','business')
    when 'audit_log'         then p = 'business'
    else true end $$;

-- A workspace can write only while its trial or paid period is running (otherwise it is read-only).
create or replace function public.subscription_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (s.status = 'trialing' and coalesce(s.trial_ends_at, now()) > now())
        or (s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))
    from public.subscriptions s where s.company_id = public.current_company_id()), false)
$$;

create or replace function public.has_feature(f text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.subscription_active()
     and public.plan_allows((select plan from public.subscriptions where company_id = public.current_company_id()), f)
$$;

-- ── Database-level enforcement (restrictive policies AND with the existing role policies) ──
do $$
declare t text; op text; cmd text;
begin
  -- 1. Read-only mode when the subscription/trial has ended
  foreach t in array array['projects','project_members','project_sites','tasks','daily_site_reports','workers','attendance_records',
    'materials','suppliers','stock_movements','material_requests','purchase_orders','contractors','contractor_bills',
    'contractor_payments','expenses','budgets','budget_revisions','documents']
  loop
    foreach op in array array['insert','update','delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_sub_' || op, t);
      cmd := case op when 'insert' then 'with check (public.subscription_active())' else 'using (public.subscription_active())' end;
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s', t || '_sub_' || op, t, op, cmd);
    end loop;
  end loop;

  -- 2. Plan-gated modules (writes blocked unless the plan includes the feature)
  foreach t in array array['contractors','contractor_bills','contractor_payments'] loop
    foreach op in array array['insert','update','delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_plan_' || op, t);
      cmd := case op when 'insert' then 'with check (public.has_feature(''contractor_bills''))' else 'using (public.has_feature(''contractor_bills''))' end;
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s', t || '_plan_' || op, t, op, cmd);
    end loop;
  end loop;
  foreach t in array array['budgets','budget_revisions'] loop
    foreach op in array array['insert','update','delete'] loop
      execute format('drop policy if exists %I on public.%I', t || '_plan_' || op, t);
      cmd := case op when 'insert' then 'with check (public.has_feature(''budgets''))' else 'using (public.has_feature(''budgets''))' end;
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s', t || '_plan_' || op, t, op, cmd);
    end loop;
  end loop;
end $$;

-- Audit log is a Business-plan feature
drop policy if exists audit_plan on public.audit_logs;
create policy audit_plan on public.audit_logs as restrictive for select to authenticated using (public.has_feature('audit_log'));

-- ── Upgrade / activation requests ────────────────────────────
create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.current_company_id() references public.companies(id) on delete cascade,
  requested_plan text not null check (requested_plan in ('starter','growth','business')),
  message text check (char_length(message) <= 1000),
  phone text check (char_length(phone) <= 40),
  status text not null default 'new' check (status in ('new','contacted','activated','dismissed')),
  requested_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.plan_requests enable row level security;
drop policy if exists plan_requests_sel on public.plan_requests;
drop policy if exists plan_requests_ins on public.plan_requests;
create policy plan_requests_sel on public.plan_requests for select to authenticated
  using (company_id = public.current_company_id() and public.current_role_name() = 'owner');
create policy plan_requests_ins on public.plan_requests for insert to authenticated
  with check (company_id = public.current_company_id() and public.current_role_name() = 'owner');

-- ── RPCs ─────────────────────────────────────────────────────
-- Owners can switch which plan they are TRIALLING (no payment involved, only while status = trialing).
create or replace function public.choose_trial_plan(p_plan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_plan not in ('starter','growth','business') then raise exception 'Unknown plan'; end if;
  if public.current_role_name() is distinct from 'owner' then raise exception 'Only the business owner can change the plan'; end if;
  update public.subscriptions
     set plan = p_plan, project_limit = public.plan_project_limit(p_plan), user_limit = public.plan_user_limit(p_plan)
   where company_id = public.current_company_id() and status = 'trialing';
  if not found then raise exception 'Your subscription is already active. Send a plan change request from Settings → Plan & Billing.'; end if;
end $$;

-- Evynta staff only (run from the Supabase SQL editor / service role): activate or change a customer's plan after payment.
create or replace function public.set_company_plan(p_company uuid, p_plan text, p_status text default 'active', p_period_end timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_plan not in ('starter','growth','business') then raise exception 'Unknown plan'; end if;
  if p_status not in ('trialing','active','past_due','canceled') then raise exception 'Unknown status'; end if;
  insert into public.subscriptions(company_id, plan, status, current_period_end, trial_ends_at, project_limit, user_limit)
  values (p_company, p_plan, p_status, p_period_end, case when p_status = 'trialing' then coalesce(p_period_end, now() + interval '14 days') end,
          public.plan_project_limit(p_plan), public.plan_user_limit(p_plan))
  on conflict (company_id) do update
    set plan = excluded.plan, status = excluded.status, current_period_end = excluded.current_period_end,
        trial_ends_at = case when excluded.status = 'trialing' then excluded.trial_ends_at else public.subscriptions.trial_ends_at end,
        project_limit = excluded.project_limit, user_limit = excluded.user_limit;
  update public.plan_requests set status = 'activated' where company_id = p_company and requested_plan = p_plan and status in ('new','contacted');
end $$;

-- New sign-ups: company + owner + 14-day trial of the plan they picked (Growth if none)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv record; cid uuid; fname text; pl text;
begin
  fname := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  select * into inv from public.invitations
   where lower(email) = lower(new.email) and accepted_at is null order by created_at desc limit 1;
  if found then
    insert into public.profiles(id, company_id, full_name, email, role) values (new.id, inv.company_id, fname, new.email, inv.role);
    update public.invitations set accepted_at = now() where id = inv.id;
  else
    pl := coalesce(nullif(new.raw_user_meta_data->>'plan', ''), 'growth');
    if pl not in ('starter','growth','business') then pl := 'growth'; end if;
    insert into public.companies(name)
      values (coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), fname || '''s company'))
      returning id into cid;
    insert into public.profiles(id, company_id, full_name, email, role) values (new.id, cid, fname, new.email, 'owner');
    insert into public.subscriptions(company_id, plan, status, trial_ends_at, project_limit, user_limit)
      values (cid, pl, 'trialing', now() + interval '14 days', public.plan_project_limit(pl), public.plan_user_limit(pl));
  end if;
  return new;
end $$;

-- Existing workspaces: apply plan limits and give a 30-day grace period so nobody is locked out by this release
update public.subscriptions
   set project_limit = public.plan_project_limit(plan), user_limit = public.plan_user_limit(plan),
       trial_ends_at = case when status = 'trialing' then greatest(coalesce(trial_ends_at, now()), now() + interval '30 days') else trial_ends_at end;

do $$
declare f text;
begin
  foreach f in array array['has_feature(text)','subscription_active()','choose_trial_plan(text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke execute on function public.set_company_plan(uuid, text, text, timestamptz) from public, anon, authenticated;
end $$;
