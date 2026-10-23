# SitePilot by Evynta

Construction project & site management SaaS for builders and contractors (India, starting West Bengal).
Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage, RLS) · Recharts · deploys on Vercel.

**Modules:** Overview dashboard · Projects & sites · Daily site reports with photos and review workflow · Tasks & milestones ·
Labour & attendance (wages vs payments) · Materials & stock ledger (requests, issue, transfer) · Purchases & suppliers ·
Contractor bills (approval, retention, revisions, payments) · Expenses & budgets (actual / committed / estimate) ·
Documents (private storage) · Reports (12 reports, CSV, print) · AI Site Assistant · Team, roles, audit log, notifications.

---

## 1. Supabase setup (10 min)

1. Create a project at supabase.com (region: **Mumbai / ap-south-1**).
2. **SQL Editor → run the four files in `supabase/migrations/` in this order** (or `supabase link` + `supabase db push`):
   1. `20260101000001_schema.sql` – tables
   2. `20260101000002_security_automation.sql` – RLS, role guards, triggers, RPCs, signup trigger
   3. `20260101000003_demo_seed.sql` – "Load sample data" function
   4. `20260101000004_storage.sql` – private `project-files` bucket + policies
   5. `20260101000005_plans_and_billing.sql` – plans, feature access, read-only mode, upgrade requests (**run this after 1–4; safe on an existing database**)
3. **Authentication → Providers → Email**: enable, and keep **Confirm email ON** (invitations rely on it).
4. **Authentication → URL Configuration**
   - Site URL: `https://sitepilot.evynta.in`
   - Redirect URLs: `https://sitepilot.evynta.in/auth/callback` and `http://localhost:3000/auth/callback`
5. **Project Settings → API**: copy the Project URL, `anon` key and `service_role` key.

### Google sign-in (optional but recommended)
1. **Google Cloud Console** → APIs & Services → **OAuth consent screen**: User type *External*, app name `SitePilot`, support email, authorised domain `evynta.in`. Click **Publish app** (otherwise only test users can sign in).
2. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorised JavaScript origins: `https://sitepilot.evynta.in` and `http://localhost:3000`
   - Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows the exact URL on the Google provider page)
3. Copy the **Client ID** and **Client secret**.
4. **Supabase → Authentication → Providers → Google**: enable, paste both values, save.
5. **Authentication → URL Configuration**: Site URL `https://sitepilot.evynta.in`; Redirect URLs include `https://sitepilot.evynta.in/auth/callback` and `http://localhost:3000/auth/callback`.
No extra environment variables are needed. New Google users get a workspace automatically, are asked to name their company, and keep the plan they picked on the pricing section.

## 2. Run locally

```bash
cp .env.example .env.local     # fill in the Supabase values
npm install
npm run dev                    # http://localhost:3000
```
Sign up → you become the **Business Owner** of a new company workspace (14-day trial) →
**Settings → Plan & Data → Load sample data** to see every screen populated.

## 3. Push to Git

```bash
git init && git add . && git commit -m "SitePilot v0.1"
git branch -M main
git remote add origin https://github.com/<you>/sitepilot.git
git push -u origin main
```
`.env*` files are git-ignored. Never commit keys.

## 4. Deploy on Vercel

1. vercel.com → **Add New → Project** → import the repo (framework auto-detects Next.js).
2. **Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (server only – used for team invites) |
| `NEXT_PUBLIC_SITE_URL` | `https://sitepilot.evynta.in` |
| `ANTHROPIC_API_KEY` | optional – enables AI-written answers (works without it using built-in rules) |
| `ANTHROPIC_MODEL` | optional, default `claude-sonnet-5-5` |

3. Deploy.

## 5. Domain `sitepilot.evynta.in`

1. Vercel → Project → **Settings → Domains → Add** `sitepilot.evynta.in`.
2. At the DNS provider of `evynta.in` add: **CNAME** · name `sitepilot` · value `cname.vercel-dns.com`
   (use the exact value Vercel shows for your project).
3. Wait for Vercel to show "Valid Configuration" (SSL is automatic). Then make sure step 1.4 URLs match.

---

## Roles and access (enforced in the database, not just the UI)

| Role | Sees | Can do |
|---|---|---|
| Owner | everything | everything incl. team, delete, demo data |
| Manager | all projects | projects, approve reports/requests/bills, budget revisions |
| Engineer | **assigned projects only** | site reports, tasks, attendance, material requests, expenses (always *pending*) |
| Storekeeper | all projects | materials, stock movements, issue, transfer, receive POs |
| Accountant | all projects | expenses, budgets, bill payments, wage payment, POs |
| Contractor | **assigned projects only** | tasks progress, submit bills, documents |

Key rules implemented as triggers/RLS: tenant isolation by `company_id`; project-level access via `project_members`;
engineers cannot approve their own reports; stock cannot go negative and ledger rows are immutable;
approved bills cannot be edited (return for correction → version bumps); bill payments cannot exceed balance;
paid attendance is locked; attendance is *payable wages* and becomes an expense only via **Record wage payment**;
PO/bill payments automatically create actual expenses; full `audit_logs` on all business tables.

## Notifications
In-app (bell icon): new site report, new material request, low stock, bill awaiting approval, budget 90% / 100%.
Email/WhatsApp notifications are not included yet (see roadmap).

## Plans and access
Three plans (`src/lib/plans.ts`, mirrored in SQL migration 5). Every new workspace gets a **14-day free trial of the plan chosen on the pricing section** (Growth if none). Access is enforced **in the database**, not just hidden in the UI.

| | Starter ₹4,999 | Growth ₹9,999 | Business ₹19,999+ |
|---|---|---|---|
| Projects / team members | 5 / 5 | 25 / 25 | Unlimited |
| Site reports, tasks, labour, materials & stock, purchases, expenses, documents | ✓ | ✓ | ✓ |
| Reports | 6 core | all 12 | all 12 |
| CSV export | – | ✓ | ✓ |
| Contractor bills & approvals | – | ✓ | ✓ |
| Budgets, revisions, variance | – | ✓ | ✓ |
| AI Site Assistant | – | ✓ | ✓ |
| Audit log | – | – | ✓ |
| Support | Email | Priority WhatsApp | Dedicated contact + onboarding |

When a trial or paid period ends the workspace becomes **read-only** (data stays visible, changes are blocked) until a plan is activated.

### How you (Evynta) activate a customer — Supabase SQL Editor
There is no payment gateway yet. Customers press **Request plan** in *Settings → Plan & Billing*; you collect payment (UPI/bank/invoice) and then activate:
```sql
-- 1. See new requests
select r.created_at, c.name as company, r.requested_plan, r.phone, r.message, r.company_id, r.status
from plan_requests r join companies c on c.id = r.company_id order by r.created_at desc;

-- 2. Activate after payment (one month shown; change the interval)
select set_company_plan('<company_id>', 'growth', 'active', now() + interval '1 month');

-- 3. Renew: run the same command again with a later date.  Suspend: use status 'canceled'.

-- 4. Keep YOUR OWN workspace on the top plan
select set_company_plan(id, 'business', 'active', now() + interval '10 years') from companies where name = 'Evynta';
```
Prices are the BRD's proposed test prices — edit them in `src/lib/plans.ts` (and the limits in migration 5 if you change them). Support levels (email / WhatsApp / dedicated contact) are service promises: only keep what you can deliver.

## Project structure
```
supabase/migrations/   SQL (schema, security, seed, storage)
src/app/               pages: landing, login, signup, demo, /app/* modules, /api/ai, /api/team/invite
src/components/        AppShell, DataModule (generic CRUD), ReportForm, UI kit
src/lib/               supabase clients, permissions, formatting, AI context
public/images/         hero.jpg, devices.jpg, projects/<project-name>.jpg
```

### Replacing images
Drop higher-resolution files with the **same names** into `public/images/` (hero ≈ 1600×1100, devices ≈ 1400×900).
Project photos go in `public/images/projects/<slug>.jpg` (slug = project name, lowercase, hyphens) and the slug must be added to `PHOTOS` in `src/components/ProjectArt.tsx`.

### Logo
`public/images/logo-*.png` (compact / full / mark, each with a `-dark` white-text version for the navy UI) and the favicon `src/app/icon.png`. Used through `src/components/Logo.tsx`.

### Performance notes
Right after login the app preloads data for every page the user's role can open (`src/lib/prefetch.ts`) into an in-memory cache (`src/lib/store.ts`); pages render from it instantly and refresh in the background.
If you add a list page, add its table/select/order to `LIST_MODULES` in `prefetch.ts` (they must match the page).
All `/app/*` module pages are statically prebuilt and prefetched; middleware only checks for a session cookie (no network call).
Keep your Supabase project in a region close to users (Mumbai `ap-south-1` for India); `vercel.json` pins API routes to `bom1`.

## Testing checklist (maps to BRD acceptance criteria)
- Sign up two separate companies → neither sees the other's data.
- Invite an engineer, assign to one project → sees only that project; cannot approve own report.
- Submit a report with photos → manager approves / requests correction → engineer edits & resubmits.
- Material request → approve → issue (stock drops; issuing more than balance is rejected).
- Contractor bill → approve → pay partially → balance and expenses update; edit after approval is blocked.
- Attendance → "Record wage payment" → labour expense appears; paid rows are locked.
- Budget vs actual on Expenses and Reports matches the underlying expense rows.
- Works on mobile (bottom navigation, responsive tables).

## Known limits / roadmap
Offline sync, WhatsApp/email notifications, Gantt timeline, accounting exports, multi-level purchase approvals,
payment gateway, per-field bill attachments (use Documents for now), AI summaries scheduled daily.
Materials listed inside a site report are informational and do **not** change stock; stock changes only through Materials.
Validate with 15–20 real contractors before building further (see BRD section 12).
