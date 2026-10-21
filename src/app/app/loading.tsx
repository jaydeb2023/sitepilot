export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-56 rounded-lg bg-slate-200" />
      <div className="h-4 w-80 rounded bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100" />)}</div>
      <div className="h-64 rounded-xl bg-slate-100" />
    </div>
  )
}
