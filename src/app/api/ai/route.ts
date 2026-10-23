import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { answerFromContext, buildContext } from '@/lib/ai/context'

export const dynamic = 'force-dynamic'

const SYSTEM = `You are the SitePilot AI Site Assistant for a construction company.
Rules:
- Answer ONLY from the JSON records provided. If the data does not contain the answer, say so plainly. Never invent numbers.
- Always state the reporting period or "as of" date your answer relies on.
- Amounts are Indian rupees; use ₹ and Indian digit grouping.
- Distinguish recorded actual expenses, committed costs (unpaid orders) and estimates.
- You can only read data. You cannot approve payments, bills or requests, or change any record. If asked, explain that an authorised user must do it in the relevant page.
- Be concise: short bullet lists, most important items first.`

export async function POST(req: Request) {
  const sb = createServerSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: allowed } = await sb.rpc('has_feature', { f: 'ai_assistant' })
  if (!allowed) return NextResponse.json({ error: 'The AI Site Assistant is available on the Growth plan and above (and while your subscription is active).' }, { status: 403 })

  const { messages } = await req.json().catch(() => ({ messages: [] }))
  const history = (Array.isArray(messages) ? messages : []).slice(-8).filter((m: any) => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role)).map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
  const last = [...history].reverse().find((m: any) => m.role === 'user')
  if (!last) return NextResponse.json({ error: 'Ask a question' }, { status: 400 })

  const ctx = await buildContext(sb)
  const key = process.env.ANTHROPIC_API_KEY
  if (key) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 900,
          system: `${SYSTEM}\n\nRECORDS (JSON):\n${JSON.stringify(ctx).slice(0, 60000)}`, messages: history,
        }),
      })
      if (r.ok) {
        const j = await r.json()
        const text = (j.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        if (text) return NextResponse.json({ answer: text, as_of: ctx.as_of, source: 'ai' })
      }
    } catch { /* fall through to rule-based answer */ }
  }
  return NextResponse.json({ answer: answerFromContext(last.content, ctx), as_of: ctx.as_of, source: 'rules' })
}
