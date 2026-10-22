'use client'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, ClipboardList, ListChecks, HardHat, Package, ShoppingCart, Users, Wallet,
  FolderOpen, BarChart3, Sparkles, Settings, Bell, Search, Menu, X, LogOut, Home,
} from 'lucide-react'
import { Logo } from './Logo'
import { useApp } from './AppProvider'
import { NAV, ROLE_LABEL } from '@/lib/permissions'
import { cn } from './ui'

const ICONS: Record<string, any> = { LayoutDashboard, Building2, ClipboardList, ListChecks, HardHat, Package, ShoppingCart, Users, Wallet, FolderOpen, BarChart3, Sparkles, Settings }

function Notifications() {
  const { sb, user } = useApp()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])

  const load = useCallback(async () => {
    const { data } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(15)
    setItems(data || [])
  }, [sb])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  const unread = items.filter(n => !(n.read_by || []).includes(user.id)).length
  const markAll = async () => { await sb.rpc('mark_notifications_read'); load() }

  return (
    <div className="relative">
      <button onClick={() => { setOpen(o => !o); if (!open) load() }} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
        <Bell size={19} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] rounded-xl border border-slate-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-semibold">Notifications</span>
              <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:underline">Mark all read</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up.</p>}
              {items.map(n => {
                const isUnread = !(n.read_by || []).includes(user.id)
                return (
                  <button key={n.id} onClick={() => { setOpen(false); if (n.link) router.push(n.link) }}
                    className={cn('block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', isUnread && 'bg-brand-50/50')}>
                    <div className="flex items-start gap-2">
                      {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="truncate text-xs text-slate-500">{n.body}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { sb, profile, company, role } = useApp()
  const pathname = usePathname()
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)
  const [pending, setPending] = useState<string | null>(null)   // highlight the clicked item immediately
  const [q, setQ] = useState('')
  const nav = NAV.filter(n => n.roles.includes(role))
  const current = pending ?? pathname
  const isActive = (href: string) => (href === '/app' ? current === '/app' : current.startsWith(href))
  useEffect(() => { setDrawer(false); setPending(null) }, [pathname])
  useEffect(() => { nav.forEach(n => router.prefetch(n.href)) }, [role])   // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => { await sb.auth.signOut(); window.location.href = '/login' }
  const initials = (profile.full_name || 'U').split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5"><Logo height={38} /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map(n => {
          const Icon = ICONS[n.icon]
          return (
            <Link key={n.href} href={n.href} onClick={() => setPending(n.href)}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive(n.href) ? 'bg-brand-600 text-white shadow' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
              <Icon size={18} /> {n.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 truncate px-2 text-[11px] font-medium text-slate-400">{company.name}</div>
        <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )

  const mobileNav = [
    { href: '/app', label: 'Home', Icon: Home },
    { href: '/app/site-reports', label: 'Reports', Icon: ClipboardList },
    { href: '/app/materials', label: 'Materials', Icon: Package },
    { href: '/app/tasks', label: 'Tasks', Icon: ListChecks },
    { href: '/app/settings', label: 'Profile', Icon: Settings },
  ].filter(m => nav.some(n => n.href === m.href))

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-navy-900 lg:block">{SidebarBody}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-navy-900">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 text-slate-400"><X size={20} /></button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-100 bg-white/90 px-4 backdrop-blur">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Menu"><Menu size={20} /></button>
          <form className="relative hidden max-w-sm flex-1 sm:block" onSubmit={e => { e.preventDefault(); if (q.trim()) router.push(`/app/projects?q=${encodeURIComponent(q.trim())}`) }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <Notifications />
            <div className="ml-1 flex items-center gap-2.5 rounded-lg px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials}</div>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-semibold text-slate-800">{profile.full_name}</div>
                <div className="text-[11px] text-slate-400">{ROLE_LABEL[role]}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 pb-24 sm:p-6 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobileNav.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive(href) ? 'text-brand-600' : 'text-slate-400')}>
            <Icon size={20} /> {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
