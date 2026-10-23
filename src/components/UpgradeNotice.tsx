'use client'
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import { useApp } from './AppProvider'
import { FormModal } from './DataModule'
import { Btn, Card } from './ui'
import { Feature, FEATURE_INFO, minPlanFor, Plan, PLAN_NAME, PLANS } from '@/lib/plans'

export function RequestUpgradeModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { sb, profile } = useApp()
  return (
    <FormModal title="Request plan activation" submitLabel="Send request" onClose={onClose}
      initial={{ requested_plan: plan, phone: profile.phone || '' }}
      fields={[
        { name: 'requested_plan', label: 'Plan', type: 'select', required: true, options: PLANS.map(p => ({ value: p.id, label: `${p.name} — ${p.price}/month` })) },
        { name: 'phone', label: 'Phone / WhatsApp for our team to reach you', type: 'tel' },
        { name: 'message', label: 'Anything we should know? (optional)', type: 'textarea' },
      ]}
      onSubmit={async v => {
        const { error } = await sb.from('plan_requests').insert(v)
        if (error) { toast.error(error.message); return false }
        toast.success('Request sent. The Evynta team will contact you to activate your plan.')
      }} />
  )
}

/** Shown in place of a page / section that the current plan (or an ended trial) does not include. */
export default function UpgradeNotice({ feature, inline = false }: { feature: Feature; inline?: boolean }) {
  const { plan, role, subActive } = useApp()
  const [open, setOpen] = useState(false)
  const info = FEATURE_INFO[feature]
  const need = minPlanFor(feature)
  return (
    <Card className={`mx-auto max-w-xl p-8 text-center ${inline ? '' : 'mt-10'}`}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Lock size={26} /></span>
      <h2 className="mt-4 text-xl font-bold text-slate-900">{info.label}</h2>
      <p className="mt-2 text-sm text-slate-500">{info.desc}</p>
      <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {subActive
          ? <>This is included in the <b>{PLAN_NAME[need]}</b> plan{need === 'growth' ? ' and above' : ''}. You are on <b>{PLAN_NAME[plan]}</b>.</>
          : <>Your trial or subscription has ended. Choose a plan to continue using this feature.</>}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/app/settings?tab=plan"><Btn variant="secondary">Compare plans</Btn></Link>
        {role === 'owner'
          ? <Btn onClick={() => setOpen(true)}>Request {PLAN_NAME[need]} plan</Btn>
          : <span className="self-center text-xs text-slate-400">Ask your business owner to upgrade.</span>}
      </div>
      {open && <RequestUpgradeModal plan={need} onClose={() => setOpen(false)} />}
    </Card>
  )
}
