export function inr(n: number | null | undefined, opts: { compact?: boolean } = {}) {
  const v = Number(n || 0)
  const abs = Math.abs(v)
  if (opts.compact !== false) {
    if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
    if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`
  }
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function crShort(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)

export const titleCase = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
