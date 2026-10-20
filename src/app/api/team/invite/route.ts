import { NextResponse } from 'next/server'
import { createServerSupabase, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const ROLES = ['manager', 'engineer', 'storekeeper', 'accountant', 'contractor']

export async function POST(req: Request) {
  const sb = createServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await sb.from('profiles').select('company_id, role').eq('id', user.id).maybeSingle()
  if (!me || me.role !== 'owner') return NextResponse.json({ error: 'Only the business owner can invite team members' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const role = String(body.role || '')
  const name = String(body.full_name || '').trim().slice(0, 120)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const admin = createServiceClient()
  const { data: sub } = await admin.from('subscriptions').select('user_limit').eq('company_id', me.company_id).maybeSingle()
  const { count: members } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', me.company_id).eq('active', true)
  const { count: pending } = await admin.from('invitations').select('id', { count: 'exact', head: true }).eq('company_id', me.company_id).is('accepted_at', null)
  if (sub && (members || 0) + (pending || 0) >= sub.user_limit) return NextResponse.json({ error: `User limit (${sub.user_limit}) reached for your plan` }, { status: 400 })

  // The invitation row must exist BEFORE the auth user is created: a database trigger uses it to attach the new user to this company.
  const { data: inv, error: ie } = await admin.from('invitations').insert({ company_id: me.company_id, email, role, invited_by: user.id }).select('id').single()
  if (ie) return NextResponse.json({ error: ie.message }, { status: 400 })

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${origin}/auth/callback` })
  if (error) {
    await admin.from('invitations').delete().eq('id', inv.id)
    const msg = /already/i.test(error.message) ? 'That email already has a SitePilot account' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
