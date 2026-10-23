'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useApp } from '@/components/AppProvider'
import Pricing from '@/components/Pricing'
import UpgradeNotice, { RequestUpgradeModal } from '@/components/UpgradeNotice'
import { Plan, PLAN_NAME, PlanDef } from '@/lib/plans'
import { Progress, inputAuto, Badge, Btn, Card, CardTitle, inputCls, Label, PageHeader, Spinner, Tabs } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { ROLE_LABEL, Role } from '@/lib/permissions'

const INVITE_ROLES: Role[] = ['manager', 'engineer', 'storekeeper', 'accountant', 'contractor']

export default function Settings() {
  const { sb, profile, company, subscription, role, refresh, plan, allows, subActive, daysLeft } = useApp()
  const [tab, setTab] = useState<'profile' | 'team' | 'plan' | 'audit'>('profile')
  const [me, setMe] = useState({ full_name: profile.full_name || '', phone: profile.phone || '' })
  const [companyName, setCompanyName] = useState(company.name)
  const [team, setTeam] = useState<any[] | null>(null)
  const [invite, setInvite] = useState({ email: '', full_name: '', role: 'engineer' })
  const [busy, setBusy] = useState('')
  const [audit, setAudit] = useState<any[] | null>(null)
  const [projectCount, setProjectCount] = useState<number | null>(null)
  const isOwner = role === 'owner'
  const [req, setReq] = useState<Plan | null>(null)
  useEffect(() => { const q = new URLSearchParams(window.location.search).get('tab'); if (q && ['profile', 'team', 'plan', 'audit'].includes(q)) setTab(q as any) }, [])

  const loadTeam = useCallback(async () => { const { data } = await sb.from('profiles').select('*').order('created_at'); setTeam(data || []) }, [sb])
  useEffect(() => { loadTeam(); sb.from('projects').select('id', { count: 'exact', head: true }).then(({ count }: any) => setProjectCount(count || 0)) }, [loadTeam, sb])
  useEffect(() => { if (tab === 'audit' && !audit && allows('audit_log')) sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }: any) => setAudit(data || [])) }, [tab, audit, sb])

  const saveProfile = async () => {
    const { error } = await sb.from('profiles').update(me).eq('id', profile.id)
    if (error) return toast.error(error.message)
    if (isOwner && companyName.trim() && companyName !== company.name) {
      const r = await sb.from('companies').update({ name: companyName.trim() }).eq('id', company.id)
      if (r.error) return toast.error(r.error.message)
    }
    toast.success('Saved'); refresh()
  }
  const sendInvite = async () => {
    setBusy('invite')
    const r = await fetch('/api/team/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(invite) })
    const j = await r.json(); setBusy('')
    if (!r.ok) return toast.error(j.error || 'Could not send invite')
    toast.success(`Invitation sent to ${invite.email}`); setInvite({ email: '', full_name: '', role: 'engineer' }); loadTeam()
  }
  const update = async (id: string, patch: any) => { const { error } = await sb.from('profiles').update(patch).eq('id', id); if (error) toast.error(error.message); else loadTeam() }
  const tryPlan = async (id: Plan) => {
    setBusy(id)
    const { error } = await sb.rpc('choose_trial_plan', { p_plan: id })
    setBusy('')
    if (error) return toast.error(error.message)
    toast.success(`Your free trial is now on the ${PLAN_NAME[id]} plan`); refresh()
  }
  const trialing = subscription?.status === 'trialing'
  const cta = (p: PlanDef) => {
    if (!isOwner) return <p className="rounded-lg bg-slate-50 py-2.5 text-center text-xs text-slate-400">Only the business owner can change plans</p>
    if (p.id === plan) return trialing || !subActive
      ? <Btn className="w-full" onClick={() => setReq(p.id)}>Activate {p.name}</Btn>
      : <div className="rounded-lg bg-emerald-50 py-2.5 text-center text-sm font-semibold text-emerald-700">Current plan</div>
    return (
      <div className="space-y-2">
        {trialing && <Btn variant="secondary" className="w-full" loading={busy === p.id} onClick={() => tryPlan(p.id)}>Try {p.name} free</Btn>}
        <Btn variant={trialing ? 'ghost' : 'primary'} className="w-full" onClick={() => setReq(p.id)}>{trialing ? `Request ${p.name}` : `Request change to ${p.name}`}</Btn>
      </div>
    )
  }
  const seed = async () => {
    if (!confirm('Load sample projects, reports, labour, stock and bills into this empty workspace?')) return
    setBusy('seed'); const { error } = await sb.rpc('seed_demo_data'); setBusy('')
    if (error) toast.error(error.message); else { toast.success('Sample data loaded'); setProjectCount(8) }
  }

  const tabs = [{ id: 'profile' as const, label: 'Profile' }, { id: 'team' as const, label: 'Team' }, { id: 'plan' as const, label: 'Plan & Billing' }, ...(role === 'owner' || role === 'manager' ? [{ id: 'audit' as const, label: 'Audit Log' }] : [])]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Users & Settings" subtitle={`${company.name} · ${ROLE_LABEL[role as Role]}`} />
      <Tabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'profile' && (
        <Card className="max-w-lg space-y-3 p-5">
          <div><Label>Full name</Label><input className={inputCls} value={me.full_name} onChange={e => setMe({ ...me, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label><input className={inputCls} value={me.phone} onChange={e => setMe({ ...me, phone: e.target.value })} /></div>
          <div><Label>Email</Label><input className={inputCls} value={profile.email || ''} disabled /></div>
          {isOwner && <div><Label>Company name</Label><input className={inputCls} value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>}
          <Btn onClick={saveProfile}>Save changes</Btn>
        </Card>)}

      {tab === 'team' && (!team ? <Spinner /> : (
        <div className="space-y-4">
          {isOwner && <Card className="p-5"><CardTitle>Invite a team member</CardTitle>
            <div className="grid gap-3 sm:grid-cols-4"><div className="sm:col-span-2"><Label>Email</Label><input className={inputCls} type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} /></div>
              <div><Label>Name</Label><input className={inputCls} value={invite.full_name} onChange={e => setInvite({ ...invite, full_name: e.target.value })} /></div>
              <div><Label>Role</Label><select className={inputCls} value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value })}>{INVITE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div></div>
            <Btn className="mt-3" onClick={sendInvite} loading={busy === 'invite'} disabled={!invite.email}>Send invitation</Btn>
            <p className="mt-2 text-xs text-slate-400">Invited users get an email to set a password. Assign engineers and contractors to projects from each project page.</p></Card>}
          <Card className="divide-y divide-slate-50">
            {team.map(m => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-900">{m.full_name} {m.id === profile.id && <span className="text-xs text-slate-400">(you)</span>}</div><div className="text-xs text-slate-400">{m.email}</div></div>
                {isOwner && m.id !== profile.id ? (
                  <><select className={inputAuto + ' w-auto'} value={m.role} onChange={e => update(m.id, { role: e.target.value })}>{(['owner', ...INVITE_ROLES] as Role[]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                    <Btn size="sm" variant={m.active ? 'danger' : 'success'} onClick={() => update(m.id, { active: !m.active })}>{m.active ? 'Deactivate' : 'Activate'}</Btn></>
                ) : <><Badge tone="blue">{ROLE_LABEL[m.role as Role]}</Badge>{!m.active && <Badge>Inactive</Badge>}</>}
              </div>))}
          </Card>
        </div>))}

      {tab === 'plan' && (
        <div className="space-y-5">
          <Card className="p-5"><CardTitle>Your subscription</CardTitle>
            {subscription ? (
              <>
                <div className="grid gap-4 text-sm sm:grid-cols-4">
                  <div><div className="text-xs text-slate-500">Plan</div><b>{PLAN_NAME[plan]}</b></div>
                  <div><div className="text-xs text-slate-500">Status</div><Badge tone={!subActive ? 'red' : trialing ? 'blue' : 'green'}>{!subActive ? 'Ended' : trialing ? 'Free trial' : 'Active'}</Badge></div>
                  <div><div className="text-xs text-slate-500">{trialing ? 'Trial ends' : 'Current period ends'}</div><b>{fmtDate(subscription.trial_ends_at && trialing ? subscription.trial_ends_at : subscription.current_period_end)}</b></div>
                  <div><div className="text-xs text-slate-500">Days left</div><b>{subActive ? daysLeft ?? '—' : 0}</b></div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[['Projects', projectCount ?? 0, subscription.project_limit], ['Team members', (team || []).filter(m => m.active).length, subscription.user_limit]].map(([l, used, limit]: any) => (
                    <div key={l}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-slate-600">{l}</span><span>{used} / {limit >= 9999 ? 'Unlimited' : limit}</span></div>
                      <Progress value={limit >= 9999 ? 5 : Math.min(100, (used / limit) * 100)} tone={used >= limit ? 'red' : 'green'} /></div>
                  ))}
                </div>
                {!subActive && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Your {trialing ? 'trial' : 'plan period'} has ended: data is read-only until a plan is activated.</p>}
              </>
            ) : <p className="text-sm text-slate-500">No subscription record.</p>}
            <p className="mt-3 text-xs text-slate-400">Plans are activated by the Evynta team after you confirm. Use “Try … free” to explore another plan during your trial, or send a request and we will contact you.</p></Card>
          <Pricing mode="app" current={plan} cta={cta} />
          {isOwner && <Card className="p-5"><CardTitle>Sample data</CardTitle>
            <p className="mb-3 text-sm text-slate-500">Fill an empty workspace with 8 sample projects, reports, attendance, stock, purchase orders and bills so you can explore every screen. Delete the projects afterwards to start clean.</p>
            <Btn variant="secondary" onClick={seed} loading={busy === 'seed'} disabled={(projectCount ?? 1) > 0}>{(projectCount ?? 1) > 0 ? 'Workspace is not empty' : 'Load sample data'}</Btn></Card>}
          {req && <RequestUpgradeModal plan={req} onClose={() => setReq(null)} />}
        </div>)}

      {tab === 'audit' && !allows('audit_log') && <UpgradeNotice feature="audit_log" inline />}
      {tab === 'audit' && allows('audit_log') && (!audit ? <Spinner /> : (
        <Card className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"><th className="px-4 py-2.5">When</th><th className="px-4 py-2.5">Table</th><th className="px-4 py-2.5">Action</th><th className="px-4 py-2.5">By</th></tr></thead>
          <tbody>{audit.map(a => <tr key={a.id} className="border-b border-slate-50"><td className="px-4 py-2">{new Date(a.created_at).toLocaleString('en-IN')}</td><td className="px-4 py-2">{a.table_name.replace(/_/g, ' ')}</td><td className="px-4 py-2"><Badge tone={a.action === 'DELETE' ? 'red' : a.action === 'INSERT' ? 'green' : 'blue'}>{a.action}</Badge></td>
            <td className="px-4 py-2 text-xs text-slate-500">{team?.find(t => t.id === a.user_id)?.full_name || (a.user_id ? a.user_id.slice(0, 8) : 'system')}</td></tr>)}</tbody></table>
          {audit.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No activity recorded yet.</p>}</Card>))}
    </div>
  )
}
