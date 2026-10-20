'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import { Btn, Card, inputCls } from '@/components/ui'

type Msg = { role: 'user' | 'assistant'; content: string; meta?: string }
const SUGGEST = ['Which projects are over budget?', 'Which sites have overdue tasks?', "Summarize yesterday's site reports", 'Which materials are running low?', 'What labour costs were recorded this week?', 'Which contractor bills are pending approval?']

function Md({ text }: { text: string }) {
  return <div className="space-y-1 text-sm leading-relaxed">{text.split('\n').map((l, i) => {
    const parts = l.replace(/^- /, '• ').split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((s, j) => s.startsWith('**') ? <b key={j}>{s.slice(2, -2)}</b> : s.startsWith('_') && s.endsWith('_') && s.length > 2 ? <i key={j} className="text-slate-500">{s.slice(1, -1)}</i> : s)
    return <p key={i} className={l ? '' : 'h-2'}>{parts}</p>
  })}</div>
}

export default function AI() {
  const { profile } = useApp()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, busy])

  const ask = async (text: string) => {
    if (!text.trim() || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next); setQ(''); setBusy(true)
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }) })
      const j = await r.json()
      setMsgs([...next, { role: 'assistant', content: r.ok ? j.answer : j.error || 'Something went wrong.', meta: r.ok ? `Records as of ${j.as_of} · ${j.source === 'ai' ? 'AI-generated' : 'rule-based'}` : undefined }])
    } catch { setMsgs([...next, { role: 'assistant', content: 'Could not reach the assistant. Please try again.' }]) }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><Sparkles size={18} /></span>
        <div><h1 className="text-xl font-bold">AI Site Assistant</h1><p className="text-xs text-slate-500">Answers use only the records you are authorised to see. It cannot approve or change anything.</p></div></div>
      <Card className="flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="py-6 text-center"><p className="text-sm text-slate-500">Hi {(profile.full_name || '').split(' ')[0]}, ask about your sites:</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">{SUGGEST.map(s => <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700">{s}</button>)}</div></div>)}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${m.role === 'user' ? 'bg-brand-600 text-sm text-white' : 'bg-slate-100 text-slate-800'}`}>
              {m.role === 'user' ? m.content : <Md text={m.content} />}{m.meta && <div className="mt-2 text-[10px] text-slate-400">{m.meta}</div>}</div></div>))}
        {busy && <div className="text-sm text-slate-400">Checking your records…</div>}<div ref={end} />
      </Card>
      <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); ask(q) }}>
        <input className={inputCls} placeholder="Ask about budgets, tasks, stock, labour, bills…" value={q} onChange={e => setQ(e.target.value)} maxLength={500} />
        <Btn type="submit" disabled={busy || !q.trim()}><Send size={15} /></Btn></form>
    </div>
  )
}
