-- ============================================================
-- SitePilot · Demo data loader (run 3 of 4)
-- Called from Settings → "Load demo data". Owner only, empty workspace only.
-- ============================================================
create or replace function public.seed_demo_data() returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.current_company_id();
  uid uuid := auth.uid();
  pids uuid[] := '{}'; mids uuid[] := '{}'; wids uuid[] := '{}'; sids uuid[] := '{}'; kids uuid[] := '{}';
  pid uuid; nid uuid; r record; pr record;
  i int; k int; m int; n int; dt date; total numeric; f numeric;
  cats text[] := array['material','labour','equipment','transport','contractor'];
  wts  numeric[] := array[0.45, 0.30, 0.10, 0.05, 0.10];
  rq   numeric[] := array[1200, 25, 50000, 150, 200, 50, 2000, 1000, 120, 150];
  uc   numeric[] := array[410, 62000, 8.5, 55, 60, 950, 48, 42, 320, 280];
begin
  if cid is null then raise exception 'No workspace found'; end if;
  if public.current_role_name() <> 'owner' then raise exception 'Only the workspace owner can load demo data'; end if;
  if exists (select 1 from public.projects where company_id = cid) then
    raise exception 'Demo data can only be loaded into an empty workspace';
  end if;
  perform set_config('app.seeding', 'on', true);

  -- Projects
  for r in select * from (values
    ('RR-001','Riverside Residency','Residential','Aarav Developers','Salt Lake, Kolkata',-200,160,50000000,45000000,'on_track',75),
    ('GC-002','Green City Mall','Commercial','Greenfield Retail LLP','New Town, Kolkata',-150,215,85000000,78000000,'delayed',40),
    ('SA-003','Skyline Apartments','Residential','Skyline Homes','Howrah',-140,130,42000000,38000000,'on_track',60),
    ('LV-004','Lakeview Villas','Residential','Lakeview Estates','Rajarhat',-60,280,48000000,43000000,'on_track',30),
    ('MO-005','Metro Office Tower','Commercial','Metro Realty','Sector V, Salt Lake',-90,400,120000000,110000000,'at_risk',20),
    ('SH-006','Sunshine Heights','Residential','Sunshine Group','Barasat',-300,20,65000000,58000000,'on_track',90),
    ('HW-007','Harbour Warehouse','Infrastructure','Eastern Logistics','Haldia',-120,90,30000000,27000000,'delayed',55),
    ('PS-008','Park Street Fit-out','Interior','Casa Interiors','Park Street, Kolkata',-180,-10,15000000,13500000,'completed',100)
  ) as v(code,name,ptype,client,addr,s_off,e_off,contract,budget,status,progress) loop
    insert into public.projects(company_id, code, name, project_type, client_name, site_address, start_date, target_date,
                                contract_value, approved_budget, manager_id, status, progress)
    values (cid, r.code, r.name, r.ptype, r.client, r.addr, current_date + r.s_off, current_date + r.e_off,
            r.contract, r.budget, uid, r.status, r.progress)
    returning id into pid;
    pids := pids || pid;
    insert into public.project_sites(company_id, project_id, name) values (cid, pid, 'Block A'), (cid, pid, 'Block B');
    insert into public.project_members(project_id, user_id, company_id) values (pid, uid, cid);
  end loop;

  -- Catalogue
  for r in select * from (values
    ('Cement','Cement','bag',500),('TMT Steel 12mm','Steel','ton',10),('Bricks','Masonry','nos',20000),
    ('Sand','Aggregates','cft',100),('Aggregate 20mm','Aggregates','cft',100),('RCC Pipe','Plumbing','nos',50),
    ('Wall Tiles','Finishing','sqft',500),('Electrical Wire 2.5mm','Electrical','m',300),
    ('PVC Pipe 4in','Plumbing','nos',40),('Paint (Emulsion)','Finishing','ltr',60)
  ) as v(name,cat,unit,minstock) loop
    insert into public.materials(company_id, name, category, unit, min_stock) values (cid, r.name, r.cat, r.unit, r.minstock) returning id into nid;
    mids := mids || nid;
  end loop;

  for r in select * from (values
    ('Eastern Cement Traders','9830012345'),('Bengal Steel Supply','9830023456'),
    ('Kolkata Bricks & Sand','9830034567'),('Sharma Electricals','9830045678')
  ) as v(name,phone) loop
    insert into public.suppliers(company_id, name, phone) values (cid, r.name, r.phone) returning id into nid;
    sids := sids || nid;
  end loop;

  for r in select * from (values
    ('ABC Construction','Civil',4500000),('SK Builders','Civil',3000000),('RKA Infra','Structure',6000000),
    ('Metro Contractors','Finishing',5000000),('SS Civil Works','Civil',2500000)
  ) as v(name,trade,amount) loop
    insert into public.contractors(company_id, name, trade, contract_amount) values (cid, r.name, r.trade, r.amount) returning id into nid;
    kids := kids || nid;
  end loop;

  for r in select * from (values
    ('Ramesh Das','Mason',800),('Salim Khan','Helper',500),('Bikash Shaw','Mason',800),('Ajay Yadav','Electrician',900),
    ('Raju Mondal','Helper',500),('Pintu Sarkar','Carpenter',850),('Kamal Hossain','Plumber',850),
    ('Sanjay Roy','Bar Bender',800),('Dilip Pal','Painter',700),('Mohan Lal','Helper',500)
  ) as v(name,cat,wage) loop
    insert into public.workers(company_id, name, category, daily_wage, contractor_id)
    values (cid, r.name, r.cat, r.wage, kids[1 + coalesce(array_length(wids,1), 0) % 5]) returning id into nid;
    wids := wids || nid;
  end loop;

  -- Per-project: expenses, budgets, tasks
  for i in 1..array_length(pids,1) loop
    select * into pr from public.projects where id = pids[i];
    total := pr.approved_budget * pr.progress / 100.0 * 0.95;
    n := 0;
    for m in 0..9 loop
      dt := (date_trunc('month', current_date) - (m || ' months')::interval)::date + 14;
      if dt >= pr.start_date and dt <= current_date then n := n + 1; end if;
    end loop;
    if n = 0 then n := 1; end if;
    for m in 0..9 loop
      dt := (date_trunc('month', current_date) - (m || ' months')::interval)::date + 14;
      if dt >= pr.start_date and dt <= current_date then
        for k in 1..5 loop
          insert into public.expenses(company_id, project_id, category, kind, approval_status, amount, expense_date, description, created_by)
          values (cid, pids[i], cats[k], 'actual', 'approved',
                  round(total / n * wts[k] * (0.8 + ((m * 7 + i * 3) % 5) * 0.1)), dt, initcap(cats[k]) || ' expense', uid);
        end loop;
      end if;
    end loop;
    for k in 1..5 loop
      insert into public.budgets(company_id, project_id, category, amount) values (cid, pids[i], cats[k], round(pr.approved_budget * wts[k]));
    end loop;

    insert into public.tasks(company_id, project_id, title, description, assignee_id, priority, status, due_date, progress, is_milestone) values
      (cid, pids[i], 'Structure complete', 'Milestone: structural frame handover', uid, 'high',
        case when pr.status = 'completed' then 'done' else 'in_progress' end, pr.target_date - 30, pr.progress, true),
      (cid, pids[i], 'Electrical conduit works', 'Conduit and box fixing for all floors', uid, 'medium',
        case when pr.status = 'completed' then 'done' else 'todo' end, current_date + 14, case when pr.status = 'completed' then 100 else 10 end, false),
      (cid, pids[i], 'Plastering - Block A', 'Internal plastering, floors 1-4', uid, 'high',
        case when pr.status = 'completed' then 'done' when pr.status in ('delayed','at_risk') then 'blocked' else 'in_progress' end,
        case when pr.status = 'completed' then current_date - 30 else current_date - 3 end, case when pr.status = 'completed' then 100 else 55 end, false);
  end loop;

  insert into public.expenses(company_id, project_id, category, kind, approval_status, amount, expense_date, description, vendor, created_by) values
    (cid, pids[1], 'equipment', 'actual', 'pending', 18000, current_date - 1, 'Concrete mixer rental (3 days)', 'City Equipments', uid),
    (cid, pids[4], 'transport', 'actual', 'pending', 42000, current_date - 2, 'Material transport - Rajarhat', 'Bapi Transport', uid);

  insert into public.budget_revisions(company_id, project_id, change_amount, reason, approved_by) values
    (cid, pids[2], 2000000, 'Scope change: additional parking level', uid),
    (cid, pids[5], 5000000, 'Facade upgrade approved by client', uid);

  -- Site reports
  for i in 1..6 loop
    select name into pr from public.projects where id = pids[i];
    insert into public.daily_site_reports(company_id, project_id, site_name, report_date, weather, workers_present, workers_breakdown,
        work_completed, materials_used, equipment_used, issues, safety_notes, next_day_plan, status, created_by)
    values (cid, pids[i], 'Block A', current_date - ((i - 1) % 3), case when i % 2 = 0 then 'Cloudy' else 'Clear' end, 24,
        '[{"trade":"Mason","count":12},{"trade":"Helper","count":8},{"trade":"Electrician","count":4}]'::jsonb,
        case i when 1 then '3rd floor column and beam work completed. 4th floor slab formwork in progress.'
               when 2 then 'Electrical work in progress. Conduit laying on ground floor completed.'
               when 3 then 'Plastering work completed for floors 1 and 2.'
               else 'Foundation excavation and PCC progressing as planned.' end,
        '[{"material":"Cement","qty":50,"unit":"bags"},{"material":"TMT Steel 12mm","qty":2.5,"unit":"ton"},{"material":"Bricks","qty":5000,"unit":"nos"}]'::jsonb,
        'Concrete mixer, vibrator', case when i = 2 then 'Steel delivery delayed by one day.' else null end,
        'PPE checked. No incidents reported.', 'Continue slab work and start brickwork on 2nd floor.',
        case when i <= 3 then 'submitted' else 'approved' end, uid);
  end loop;

  -- Attendance (last 11 days)
  for k in 0..10 loop
    for i in 1..array_length(wids,1) loop
      insert into public.attendance_records(company_id, project_id, worker_id, work_date, status, regular_hours, overtime_hours, wage_paid)
      values (cid, pids[1 + (i % 3)], wids[i], current_date - k,
              case when (k + i) % 7 = 0 then 'absent' when (k + i) % 11 = 0 then 'half_day' else 'present' end,
              8, case when (k + i) % 5 = 0 then 2 else 0 end, k > 4);
    end loop;
  end loop;

  -- Stock: receipts then issues, for the first three sites
  for i in 1..3 loop
    f := case i when 1 then 1 when 2 then 0.8 else 0.6 end;
    for k in 1..10 loop
      insert into public.stock_movements(company_id, project_id, material_id, movement_type, quantity, unit_cost, supplier_id, movement_date, note)
      values (cid, pids[i], mids[k], 'receipt', round(rq[k] * f), uc[k], sids[1 + (k % 4)], current_date - 30, 'Initial delivery');
      insert into public.stock_movements(company_id, project_id, material_id, movement_type, quantity, movement_date, note)
      values (cid, pids[i], mids[k], 'issue',
              round(rq[k] * f * case k when 4 then 0.7 when 6 then 0.2 else 0.45 end), current_date - 5, 'Consumed on site');
    end loop;
  end loop;

  insert into public.material_requests(company_id, project_id, material_id, quantity, needed_by, status, note, requested_by) values
    (cid, pids[1], mids[1], 200, current_date + 3, 'pending',  'Cement for 4th floor slab', uid),
    (cid, pids[3], mids[2], 5,   current_date + 5, 'pending',  'TMT steel for columns', uid),
    (cid, pids[2], mids[7], 400, current_date + 7, 'pending',  'Wall tiles for food court', uid),
    (cid, pids[1], mids[3], 3000, current_date + 2, 'approved', 'Bricks for partition walls', uid);

  insert into public.purchase_orders(company_id, po_number, supplier_id, project_id, material_id, quantity, unit_cost, order_date, amount, delivery_status, paid_amount, notes) values
    (cid, 'PO-1001', sids[1], pids[1], mids[1], 600,  410,   current_date - 12, 246000, 'delivered', 246000, 'OPC 53 grade'),
    (cid, 'PO-1002', sids[2], pids[3], mids[2], 10,   62000, current_date - 4,  620000, 'ordered',   0,      'Fe 500D'),
    (cid, 'PO-1003', sids[3], pids[2], mids[3], 30000, 8.5,  current_date - 8,  255000, 'partial',   100000, 'First class bricks'),
    (cid, 'PO-1004', sids[4], pids[1], mids[8], 800,  42,    current_date - 2,  33600,  'ordered',   0,      null),
    (cid, 'PO-1005', sids[3], pids[4], mids[4], 400,  55,    current_date - 20, 22000,  'delivered', 22000,  null);

  insert into public.contractor_bills(company_id, contractor_id, project_id, bill_no, bill_date, description, gross_amount, retention, deductions, status, paid_amount, approved_by, approved_at) values
    (cid, kids[1], pids[1], 'CB-001', current_date - 6,  'Brickwork - floors 3 and 4',     247368, 12368, 0, 'pending',  0, null, null),
    (cid, kids[2], pids[3], 'CB-002', current_date - 10, 'RCC work - podium slab',          126316, 6316,  0, 'approved', 0, uid, now()),
    (cid, kids[3], pids[2], 'CB-003', current_date - 3,  'Structural steel fabrication',    368421, 18421, 0, 'pending',  0, null, null),
    (cid, kids[4], pids[8], 'CB-004', current_date - 40, 'Interior finishing - phase 1',    505263, 25263, 0, 'paid',    480000, uid, now() - interval '35 days'),
    (cid, kids[5], pids[4], 'CB-005', current_date - 2,  'Excavation and PCC',              184211, 9211,  0, 'pending',  0, null, null);

  insert into public.notifications(company_id, roles, title, body, kind, link) values
    (cid, '{owner,manager}', 'New site report', 'Riverside Residency · today', 'report', '/app/site-reports'),
    (cid, '{owner,manager,storekeeper}', 'Low stock: Sand', 'Riverside Residency has 45 cft left (minimum 100)', 'low_stock', '/app/materials'),
    (cid, '{owner,manager,accountant}', 'Contractor bill awaiting approval', 'Bill CB-003 · net 349,999', 'bill', '/app/contractors');

  perform set_config('app.seeding', 'off', true);
end $$;

revoke execute on function public.seed_demo_data() from public, anon;
grant execute on function public.seed_demo_data() to authenticated;
