export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="spg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="9" fill="url(#spg)" />
      <path d="M10 29V17l5-3v15M17 29V12l5-3v20M24 29V15l6 3v11" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ dark = false, sub = true }: { dark?: boolean; sub?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className={`text-[17px] font-bold tracking-tight ${dark ? 'text-slate-900' : 'text-white'}`}>SitePilot</div>
        {sub && <div className={`mt-0.5 text-[10px] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>by Evynta</div>}
      </div>
    </div>
  )
}
