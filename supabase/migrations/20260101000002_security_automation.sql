-- ============================================================
-- SitePilot · Row Level Security, workflow guards, automation (run 2 of 4)
-- ============================================================

-- ── RLS: special tables ──────────────────────────────────────
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invitations enable row level security;
alter table public.demo_requests enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy companies_sel on public.companies for select to authenticated using (id = public.current_company_id());
create policy companies_upd on public.companies for update to authenticated
  using (id = public.current_company_id() and public.current_role_name() = 'owner')
  with check (id = public.current_company_id());

create policy profiles_sel on public.profiles for select to authenticated using (company_id = public.current_company_id());
create policy profiles_upd on public.profiles for update to authenticated
  using (id = auth.uid() or (company_id = public.current_company_id() and public.current_role_name() = 'owner'))
  with check (company_id = public.current_company_id());

create policy subscriptions_sel on public.subscriptions for select to authenticated using (company_id = public.current_company_id());
create policy invitations_sel on public.invitations for select to authenticated
  using (company_id = public.current_company_id() and public.current_role_name() = 'owner');

create policy demo_requests_ins on public.demo_requests for insert to anon, authenticated with check (true);

create policy projects_sel on public.projects for select to authenticated
  using (company_id = public.current_company_id() and public.can_access_project(id));
create policy projects_ins on public.projects for insert to authenticated
  with check (company_id = public.current_company_id() and public.current_role_name() in ('owner','manager'));
create policy projects_upd on public.projects for update to authenticated
  using (company_id = public.current_company_id() and public.current_role_name() in ('owner','manager') and public.can_access_project(id))
  with check (company_id = public.current_company_id());
create policy projects_del on public.projects for delete to authenticated
  using (company_id = public.current_company_id() and public.current_role_name() = 'owner');

create policy members_sel on public.project_members for select to authenticated using (company_id = public.current_company_id());
create policy members_ins on public.project_members for insert to authenticated
  with check (company_id = public.current_company_id() and public.current_role_name() in ('owner','manager'));
create policy members_del on public.project_members for delete to authenticated
  using (company_id = public.current_company_id() and public.current_role_name() in ('owner','manager'));

create policy notifications_sel on public.notifications for select to authenticated
  using (company_id = public.current_company_id()
         and (user_id = auth.uid() or (user_id is null and public.current_role_name() = any(roles))));
create policy audit_sel on public.audit_logs for select to authenticated
  using (company_id = public.current_company_id() and public.current_role_name() in ('owner','manager'));

-- ── RLS: generic tenant tables (role-based write access, project-scoped reads) ──
do $$
declare r record; sc text;
begin
  for r in select * from (values
    ('project_sites',       true,  array['owner','manager'],                                   array['owner','manager'],                                   array['owner','manager'],        null),
    ('tasks',               true,  array['owner','manager','engineer'],                        array['owner','manager','engineer','contractor'],           array['owner','manager'],        null),
    ('daily_site_reports',  true,  array['owner','manager','engineer'],                        array['owner','manager','engineer'],                        array['owner','manager'],        '(created_by = auth.uid() or public.current_role_name() in (''owner'',''manager''))'),
    ('workers',             false, array['owner','manager','engineer','accountant'],           array['owner','manager','engineer','accountant'],           array['owner','manager'],        null),
    ('attendance_records',  true,  array['owner','manager','engineer','accountant'],           array['owner','manager','engineer','accountant'],           array['owner','manager'],        null),
    ('materials',           false, array['owner','manager','storekeeper'],                     array['owner','manager','storekeeper'],                     array['owner','manager'],        null),
    ('suppliers',           false, array['owner','manager','storekeeper','accountant'],        array['owner','manager','storekeeper','accountant'],        array['owner','manager'],        null),
    ('stock_movements',     true,  array['owner','manager','storekeeper'],                     array[]::text[],                                            array[]::text[],                 null),
    ('material_requests',   true,  array['owner','manager','engineer','storekeeper'],          array['owner','manager','storekeeper'],                     array['owner','manager'],        null),
    ('purchase_orders',     true,  array['owner','manager','storekeeper','accountant'],        array['owner','manager','storekeeper','accountant'],        array['owner','manager'],        null),
    ('contractors',         false, array['owner','manager','accountant'],                      array['owner','manager','accountant'],                      array['owner','manager'],        null),
    ('contractor_bills',    true,  array['owner','manager','accountant','contractor'],         array['owner','manager','accountant'],                      array['owner','manager'],        null),
    ('contractor_payments', true,  array['owner','manager','accountant'],                      array[]::text[],                                            array['owner'],                  null),
    ('expenses',            true,  array['owner','manager','accountant','storekeeper','engineer'], array['owner','manager','accountant'],                  array['owner','manager'],        null),
    ('budgets',             true,  array['owner','manager','accountant'],                      array['owner','manager','accountant'],                      array['owner','manager'],        null),
    ('budget_revisions',    true,  array['owner','manager'],                                   array[]::text[],                                            array['owner'],                  null),
    ('documents',           true,  array['owner','manager','engineer','storekeeper','accountant','contractor'], array['owner','manager'],                  array['owner','manager'],        null)
  ) as v(t, scoped, ins, upd, del, upd_extra) loop
    sc := case when r.scoped then ' and (project_id is null or public.can_access_project(project_id))' else '' end;
    execute format('alter table public.%I enable row level security', r.t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id = public.current_company_id()%s)',
                   r.t || '_sel', r.t, sc);
    execute format('create policy %I on public.%I for insert to authenticated with check (company_id = public.current_company_id() and public.current_role_name() = any(%L::text[])%s)',
                   r.t || '_ins', r.t, r.ins, sc);
    execute format('create policy %I on public.%I for update to authenticated using (company_id = public.current_company_id() and public.current_role_name() = any(%L::text[])%s%s) with check (company_id = public.current_company_id()%s)',
                   r.t || '_upd', r.t, r.upd, sc, coalesce(' and ' || r.upd_extra, ''), sc);
    execute format('create policy %I on public.%I for delete to authenticated using (company_id = public.current_company_id() and public.current_role_name() = any(%L::text[])%s)',
                   r.t || '_del', r.t, r.del, sc);
  end loop;
end $$;

-- ── Notification helper ──────────────────────────────────────
create or replace function public.notify(p_company uuid, p_roles text[], p_title text, p_body text, p_kind text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.seeding', true) = 'on' then return; end if;
  insert into public.notifications(company_id, roles, title, body, kind, link)
  values (p_company, p_roles, p_title, p_body, p_kind, p_link);
end $$;

-- ── Audit trail ──────────────────────────────────────────────
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid uuid; rid uuid;
begin
  if current_setting('app.seeding', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'DELETE' then cid := old.company_id; rid := old.id; else cid := new.company_id; rid := new.id; end if;
  insert into public.audit_logs(company_id, user_id, table_name, record_id, action, old_data, new_data)
  values (cid, auth.uid(), tg_table_name, rid, tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','projects','tasks','daily_site_reports','workers','attendance_records','materials',
    'stock_movements','material_requests','suppliers','purchase_orders','contractors','contractor_bills',
    'contractor_payments','expenses','budgets','budget_revisions','documents']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', 'audit_' || t, t);
  end loop;
end $$;

-- ── Server-side workflow guards (UI hiding is never the only protection) ──
create or replace function public.guard_status_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := public.current_role_name(); changed boolean;
begin
  if auth.uid() is null or current_setting('app.seeding', true) = 'on' then return new; end if;

  if tg_table_name = 'daily_site_reports' then
    changed := tg_op = 'INSERT' or new.status is distinct from old.status;
    if tg_op = 'UPDATE' and old.status = 'approved' and r not in ('owner','manager') then
      raise exception 'Approved reports are locked';
    end if;
    if changed and new.status in ('approved','correction_requested') then
      if r not in ('owner','manager') then raise exception 'Only an owner or manager can review site reports'; end if;
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;

  elsif tg_table_name = 'material_requests' then
    changed := tg_op = 'INSERT' or new.status is distinct from old.status;
    if changed and new.status in ('approved','rejected') and r not in ('owner','manager') then
      raise exception 'Only an owner or manager can approve or reject material requests';
    end if;
    if changed and new.status = 'issued' and r not in ('owner','manager','storekeeper') then
      raise exception 'Only a storekeeper, manager or owner can issue materials';
    end if;
    if changed and new.status in ('approved','rejected','issued') then
      new.decided_by := auth.uid(); new.decided_at := now();
    end if;

  elsif tg_table_name = 'contractor_bills' then
    changed := tg_op = 'INSERT' or new.status is distinct from old.status;
    if tg_op = 'INSERT' then
      new.paid_amount := 0;
      if new.status <> 'pending' and r not in ('owner','manager') then new.status := 'pending'; end if;
    end if;
    if changed and new.status in ('approved','rejected','returned') and r not in ('owner','manager') then
      raise exception 'Only an owner or manager can approve, reject or return bills';
    end if;
    if changed and new.status = 'paid' and r not in ('owner','manager','accountant') then
      raise exception 'Not allowed to mark a bill as paid';
    end if;
    if changed and new.status = 'approved' then new.approved_by := auth.uid(); new.approved_at := now(); end if;
    if tg_op = 'UPDATE' then
      if new.paid_amount is distinct from old.paid_amount and current_setting('app.bill_payment', true) is distinct from 'on' then
        raise exception 'Record a payment instead of editing the paid amount';
      end if;
      if old.status in ('approved','paid')
         and (new.gross_amount <> old.gross_amount or new.retention <> old.retention or new.deductions <> old.deductions) then
        raise exception 'Approved bills cannot be edited. Return the bill for correction first.';
      end if;
      if new.gross_amount <> old.gross_amount or new.retention <> old.retention or new.deductions <> old.deductions then
        new.version := old.version + 1;   -- revision history lives in audit_logs
      end if;
    end if;

  elsif tg_table_name = 'expenses' then
    if tg_op = 'INSERT' and r not in ('owner','manager','accountant') then
      new.approval_status := 'pending';
    end if;
    if tg_op = 'UPDATE' and new.approval_status is distinct from old.approval_status
       and new.approval_status in ('approved','rejected') and r not in ('owner','manager','accountant') then
      raise exception 'Only finance roles can approve or reject expenses';
    end if;
  end if;
  return new;
end $$;

create trigger guard_reports before insert or update on public.daily_site_reports for each row execute function public.guard_status_changes();
create trigger guard_requests before insert or update on public.material_requests for each row execute function public.guard_status_changes();
create trigger guard_bills before insert or update on public.contractor_bills for each row execute function public.guard_status_changes();
create trigger guard_expenses before insert or update on public.expenses for each row execute function public.guard_status_changes();

create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if new.company_id is distinct from old.company_id then raise exception 'Cannot change company'; end if;
  if new.role is distinct from old.role or new.active is distinct from old.active then
    if public.current_role_name() <> 'owner' or old.id = auth.uid() then
      raise exception 'Only an owner can change another member''s role or status';
    end if;
  end if;
  new.email := old.email;
  return new;
end $$;
create trigger profiles_guard_trg before update on public.profiles for each row execute function public.profiles_guard();

-- ── Plan limits ──────────────────────────────────────────────
create or replace function public.enforce_project_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; cnt int;
begin
  if current_setting('app.seeding', true) = 'on' then return new; end if;
  select project_limit into lim from public.subscriptions where company_id = new.company_id;
  select count(*) into cnt from public.projects where company_id = new.company_id;
  if lim is not null and cnt >= lim then
    raise exception 'Project limit (%) reached for your plan. Please upgrade to add more projects.', lim;
  end if;
  return new;
end $$;
create trigger projects_limit before insert on public.projects for each row execute function public.enforce_project_limit();

-- ── Stock integrity ──────────────────────────────────────────
create or replace function public.stock_balance(p_company uuid, p_project uuid, p_material uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when movement_type in ('opening','receipt','transfer_in','adjustment_in') then quantity else -quantity end), 0)
  from public.stock_movements where company_id = p_company and project_id = p_project and material_id = p_material
$$;

create or replace function public.check_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  if new.movement_type in ('issue','transfer_out','adjustment_out') then
    perform pg_advisory_xact_lock(hashtextextended(new.project_id::text || new.material_id::text, 0));
    bal := public.stock_balance(new.company_id, new.project_id, new.material_id);
    if bal < new.quantity then
      raise exception 'Insufficient stock: % available, % requested', bal, new.quantity;
    end if;
  end if;
  return new;
end $$;
create trigger stock_check before insert on public.stock_movements for each row execute function public.check_stock();

create or replace function public.stock_low_alert() returns trigger
language plpgsql security definer set search_path = public as $$
declare m record; bal numeric; pname text;
begin
  if new.movement_type not in ('issue','transfer_out','adjustment_out') then return new; end if;
  select name, min_stock, unit into m from public.materials where id = new.material_id;
  if m.min_stock is null or m.min_stock <= 0 then return new; end if;
  bal := public.stock_balance(new.company_id, new.project_id, new.material_id);
  if bal <= m.min_stock and bal + new.quantity > m.min_stock then
    select name into pname from public.projects where id = new.project_id;
    perform public.notify(new.company_id, array['owner','manager','storekeeper'], 'Low stock: ' || m.name,
      coalesce(pname,'Site') || ' has ' || bal || ' ' || m.unit || ' left (minimum ' || m.min_stock || ')', 'low_stock', '/app/materials');
  end if;
  return new;
end $$;
create trigger stock_low_alert_trg after insert on public.stock_movements for each row execute function public.stock_low_alert();

-- ── Attendance: wage maths on the server, paid records locked ─
create or replace function public.attendance_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare w numeric;
begin
  if tg_op = 'INSERT' then
    if new.wage_rate is null then select daily_wage into new.wage_rate from public.workers where id = new.worker_id; end if;
  else
    if old.wage_paid and (new.status is distinct from old.status or new.regular_hours is distinct from old.regular_hours
        or new.overtime_hours is distinct from old.overtime_hours or new.worker_id is distinct from old.worker_id
        or new.work_date is distinct from old.work_date) then
      raise exception 'Wages for this record are already paid; it cannot be changed';
    end if;
    if new.wage_paid is distinct from old.wage_paid and auth.uid() is not null
       and current_setting('app.pay_wages', true) is distinct from 'on'
       and current_setting('app.seeding', true) is distinct from 'on' then
      raise exception 'Use "Record wage payment" to mark wages as paid';
    end if;
    if new.status is distinct from old.status or new.regular_hours is distinct from old.regular_hours
       or new.overtime_hours is distinct from old.overtime_hours or new.work_date is distinct from old.work_date then
      new.is_corrected := true;   -- history is kept in audit_logs
    end if;
  end if;
  w := coalesce(new.wage_rate, 0);
  new.amount := round(case new.status
      when 'absent' then 0
      when 'half_day' then w / 2
      else w * new.regular_hours / 8 + (w / 8) * new.overtime_hours * 1.5 end, 2);
  return new;
end $$;
create trigger attendance_before_trg before insert or update on public.attendance_records for each row execute function public.attendance_before();

-- ── Purchase orders: payment status + expense on payment ─────
create or replace function public.po_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.amount, 0) = 0 and new.quantity is not null and new.unit_cost is not null then
    new.amount := round(new.quantity * new.unit_cost, 2);
  end if;
  if new.paid_amount > new.amount then raise exception 'Paid amount cannot exceed the order amount'; end if;
  new.payment_status := case when new.paid_amount <= 0 then 'unpaid' when new.paid_amount >= new.amount then 'paid' else 'partial' end;
  return new;
end $$;
create trigger po_before_trg before insert or update on public.purchase_orders for each row execute function public.po_before();

create or replace function public.po_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare sname text;
begin
  if current_setting('app.seeding', true) = 'on' then return new; end if;
  if new.paid_amount > old.paid_amount then
    select name into sname from public.suppliers where id = new.supplier_id;
    insert into public.expenses(company_id, project_id, category, kind, approval_status, amount, expense_date, description, vendor, source, source_id, created_by)
    values (new.company_id, new.project_id, 'material', 'actual', 'approved', new.paid_amount - old.paid_amount, current_date,
            'Payment against PO ' || coalesce(new.po_number, ''), sname, 'purchase_order', new.id, auth.uid());
  end if;
  return new;
end $$;
create trigger po_after_trg after update on public.purchase_orders for each row execute function public.po_after();

-- ── Contractor payments: validate, roll up, record expense ───
create or replace function public.contractor_payment_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select * into b from public.contractor_bills where id = new.bill_id and company_id = new.company_id;
  if not found then raise exception 'Bill not found'; end if;
  if b.status <> 'approved' then raise exception 'Only approved bills can be paid'; end if;
  if new.amount > b.net_amount - b.paid_amount then
    raise exception 'Payment exceeds the outstanding balance of %', b.net_amount - b.paid_amount;
  end if;
  new.project_id := b.project_id;
  return new;
end $$;
create trigger contractor_payment_before_trg before insert on public.contractor_payments for each row execute function public.contractor_payment_before();

create or replace function public.contractor_payment_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare b record; cname text;
begin
  perform set_config('app.bill_payment', 'on', true);
  update public.contractor_bills
     set paid_amount = paid_amount + new.amount,
         status = case when paid_amount + new.amount >= net_amount then 'paid' else status end
   where id = new.bill_id
   returning * into b;
  perform set_config('app.bill_payment', 'off', true);
  select name into cname from public.contractors where id = b.contractor_id;
  insert into public.expenses(company_id, project_id, category, kind, approval_status, amount, expense_date, description, vendor, source, source_id, created_by)
  values (new.company_id, new.project_id, 'contractor', 'actual', 'approved', new.amount, new.paid_on,
          'Payment for bill ' || coalesce(b.bill_no, ''), cname, 'contractor_payment', new.id, auth.uid());
  return new;
end $$;
create trigger contractor_payment_after_trg after insert on public.contractor_payments for each row execute function public.contractor_payment_after();

-- ── Notifications on key events ──────────────────────────────
create or replace function public.notify_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare pname text;
begin
  select name into pname from public.projects where id = new.project_id;
  perform public.notify(new.company_id, array['owner','manager'], 'New site report',
    coalesce(pname,'Project') || ' · ' || to_char(new.report_date, 'DD Mon YYYY'), 'report', '/app/site-reports');
  return new;
end $$;
create trigger notify_report_trg after insert on public.daily_site_reports for each row execute function public.notify_report();

create or replace function public.notify_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare mname text; pname text;
begin
  select name into mname from public.materials where id = new.material_id;
  select name into pname from public.projects where id = new.project_id;
  perform public.notify(new.company_id, array['owner','manager','storekeeper'], 'New material request',
    coalesce(mname,'Material') || ' × ' || new.quantity || ' · ' || coalesce(pname,''), 'material_request', '/app/materials');
  return new;
end $$;
create trigger notify_request_trg after insert on public.material_requests for each row execute function public.notify_request();

create or replace function public.notify_bill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform public.notify(new.company_id, array['owner','manager','accountant'], 'Contractor bill awaiting approval',
      'Bill ' || coalesce(new.bill_no,'') || ' · net ' || new.net_amount, 'bill', '/app/contractors');
  end if;
  return new;
end $$;
create trigger notify_bill_trg after insert or update of status on public.contractor_bills for each row execute function public.notify_bill();

create or replace function public.notify_budget() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record; actual numeric; eff numeric; before_pct numeric; after_pct numeric;
begin
  if current_setting('app.seeding', true) = 'on' then return new; end if;
  if new.kind <> 'actual' or new.approval_status <> 'approved' then return new; end if;
  if tg_op = 'UPDATE' and old.approval_status = 'approved' and old.kind = 'actual' then return new; end if;
  select name, approved_budget into p from public.projects where id = new.project_id;
  eff := p.approved_budget + coalesce((select sum(change_amount) from public.budget_revisions where project_id = new.project_id), 0);
  if eff <= 0 then return new; end if;
  select coalesce(sum(amount), 0) into actual from public.expenses
   where project_id = new.project_id and kind = 'actual' and approval_status = 'approved';
  after_pct := actual / eff * 100; before_pct := (actual - new.amount) / eff * 100;
  if before_pct < 100 and after_pct >= 100 then
    perform public.notify(new.company_id, array['owner','manager','accountant'], 'Budget exceeded: ' || p.name,
      'Recorded expenses are at ' || round(after_pct) || '% of the approved budget', 'budget', '/app/expenses');
  elsif before_pct < 90 and after_pct >= 90 then
    perform public.notify(new.company_id, array['owner','manager','accountant'], 'Budget warning: ' || p.name,
      'Recorded expenses reached ' || round(after_pct) || '% of the approved budget', 'budget', '/app/expenses');
  end if;
  return new;
end $$;
create trigger notify_budget_trg after insert or update on public.expenses for each row execute function public.notify_budget();

-- ── RPCs (atomic multi-row operations) ───────────────────────
create or replace function public.transfer_stock(p_from uuid, p_to uuid, p_material uuid, p_qty numeric, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare ref uuid := gen_random_uuid(); cid uuid := public.current_company_id();
begin
  if public.current_role_name() not in ('owner','manager','storekeeper') then raise exception 'Not allowed'; end if;
  if p_from = p_to then raise exception 'Choose two different sites'; end if;
  if not (public.can_access_project(p_from) and public.can_access_project(p_to)) then raise exception 'No access to that project'; end if;
  insert into public.stock_movements(company_id, project_id, material_id, movement_type, quantity, ref_id, note)
    values (cid, p_from, p_material, 'transfer_out', p_qty, ref, p_note);
  insert into public.stock_movements(company_id, project_id, material_id, movement_type, quantity, ref_id, note)
    values (cid, p_to, p_material, 'transfer_in', p_qty, ref, p_note);
end $$;

create or replace function public.receive_po(p_po uuid) returns void
language plpgsql security definer set search_path = public as $$
declare po public.purchase_orders%rowtype;
begin
  if public.current_role_name() not in ('owner','manager','storekeeper') then raise exception 'Not allowed'; end if;
  select * into po from public.purchase_orders where id = p_po and company_id = public.current_company_id();
  if not found then raise exception 'Purchase order not found'; end if;
  if not public.can_access_project(po.project_id) then raise exception 'No access to that project'; end if;
  if po.delivery_status = 'delivered' then raise exception 'Already received'; end if;
  if po.material_id is null or coalesce(po.quantity, 0) <= 0 then raise exception 'Add a material and quantity to this order first'; end if;
  insert into public.stock_movements(company_id, project_id, material_id, movement_type, quantity, unit_cost, supplier_id, ref_id, note)
    values (po.company_id, po.project_id, po.material_id, 'receipt', po.quantity, po.unit_cost, po.supplier_id, po.id,
            'Received against PO ' || coalesce(po.po_number, ''));
  update public.purchase_orders set delivery_status = 'delivered' where id = p_po;
end $$;

-- Wages become an expense only when someone records the payment.
create or replace function public.pay_wages(p_project uuid default null) returns numeric
language plpgsql security definer set search_path = public as $$
declare r record; total numeric := 0; cid uuid := public.current_company_id();
begin
  if public.current_role_name() not in ('owner','manager','accountant') then raise exception 'Not allowed'; end if;
  for r in select project_id, sum(amount) as amt from public.attendance_records
            where company_id = cid and wage_paid = false and amount > 0 and (p_project is null or project_id = p_project)
            group by project_id loop
    insert into public.expenses(company_id, project_id, category, kind, approval_status, amount, expense_date, description, source, created_by)
    values (cid, r.project_id, 'labour', 'actual', 'approved', r.amt, current_date, 'Wage payment', 'wages', auth.uid());
    total := total + r.amt;
  end loop;
  perform set_config('app.pay_wages', 'on', true);
  update public.attendance_records set wage_paid = true, wage_paid_at = now()
   where company_id = cid and wage_paid = false and amount > 0 and (p_project is null or project_id = p_project);
  perform set_config('app.pay_wages', 'off', true);
  return total;
end $$;

create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_by = array_append(read_by, auth.uid())
   where company_id = public.current_company_id() and not (auth.uid() = any(read_by))
     and (user_id = auth.uid() or (user_id is null and public.current_role_name() = any(roles)))
$$;

do $$
declare f text;
begin
  foreach f in array array['transfer_stock(uuid,uuid,uuid,numeric,text)','receive_po(uuid)','pay_wages(uuid)','mark_notifications_read()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ── New user → company + owner (or join via invitation) ──────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv record; cid uuid; fname text;
begin
  fname := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
  -- Invitations are only ever created server-side (service role), never from the client.
  select * into inv from public.invitations
   where lower(email) = lower(new.email) and accepted_at is null order by created_at desc limit 1;
  if found then
    insert into public.profiles(id, company_id, full_name, email, role) values (new.id, inv.company_id, fname, new.email, inv.role);
    update public.invitations set accepted_at = now() where id = inv.id;
  else
    insert into public.companies(name)
      values (coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), fname || '''s company'))
      returning id into cid;
    insert into public.profiles(id, company_id, full_name, email, role) values (new.id, cid, fname, new.email, 'owner');
    insert into public.subscriptions(company_id, plan, status, trial_ends_at, project_limit, user_limit)
      values (cid, 'starter', 'trialing', now() + interval '14 days', 10, 10);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
