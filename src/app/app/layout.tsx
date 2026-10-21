import AppProvider from '@/components/AppProvider'
import AppShell from '@/components/AppShell'

// Static shell: every module is a client component, so Next can prefetch pages and switch instantly.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
