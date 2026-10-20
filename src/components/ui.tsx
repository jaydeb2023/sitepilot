'use client'
import { ReactNode, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-slate-100 bg-white shadow-card', className)}>{children}</div>
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[15px] font-semibold text-slate-800">{children}</h3>
      {right}
    </div>
  )
}

type BtnProps = {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size?: 'sm' | 'md'; disabled?: boolean; loading?: boolean; type?: 'button' | 'submit'; className?: string; title?: string
}
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, loading, type = 'button', className, title }: BtnProps) {
  const v = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant]
  return (
    <button
      type={type} title={title} onClick={onClick} disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm', v, className)}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

const TONES: Record<string, string> = {
  gray: 'bg-slate-100 text-slate-600', blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', purple: 'bg-violet-50 text-violet-700',
}
export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: keyof typeof TONES | string }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', TONES[tone] || TONES.gray)}>{children}</span>
}

const STATUS_TONE: Record<string, string> = {
  on_track: 'green', delayed: 'red', at_risk: 'amber', completed: 'blue', planning: 'gray',
  todo: 'gray', in_progress: 'blue', blocked: 'red', done: 'green',
  low: 'gray', medium: 'amber', high: 'red',
  pending: 'amber', approved: 'green', rejected: 'red', returned: 'purple', paid: 'blue', issued: 'blue',
  submitted: 'amber', correction_requested: 'purple',
  present: 'green', absent: 'red', half_day: 'amber',
  ordered: 'amber', partial: 'purple', delivered: 'green', cancelled: 'gray', unpaid: 'red',
  actual: 'green', committed: 'amber', estimate: 'gray',
  ok: 'green', low_stock: 'amber', out: 'red',
}
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] || 'gray'}>{(status || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</Badge>
}

export function Modal({ title, onClose, children, wide, footer }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={cn('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'green' | 'red' | 'amber' }) {
  const c = { brand: 'bg-brand-600', green: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500' }[tone]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn('-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium transition',
            value === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {t.label}
          {!!t.badge && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-slate-600">
      {children} {hint && <span className="font-normal text-slate-400">{hint}</span>}
    </label>
  )
}

export function StatTile({ icon, label, value, tone = 'blue', sub }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'blue' | 'green' | 'red' | 'amber' | 'purple'; sub?: string }) {
  const t = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-violet-50 text-violet-600' }[tone]
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', t)}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-xl font-bold text-slate-900">{value}</div>
        <div className="truncate text-xs text-slate-500">{label}</div>
        {sub && <div className="truncate text-[11px] text-slate-400">{sub}</div>}
      </div>
    </Card>
  )
}
