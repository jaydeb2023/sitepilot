/** Lightweight illustrated "photo" for a project card (used until real site photos exist). */
const PALETTES = [
  ['#cfe3ff', '#e8f1ff', '#2563eb'], ['#d8f3e6', '#effaf4', '#059669'], ['#ffe6cf', '#fff4e8', '#d97706'],
  ['#e5defa', '#f3efff', '#7c3aed'], ['#d4eef7', '#ecf8fc', '#0891b2'],
]

export default function ProjectArt({ seed, className = '', crane = false }: { seed: string; className?: string; crane?: boolean }) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [sky, sky2, tone] = PALETTES[h % PALETTES.length]
  const towers = [0, 1, 2].map(i => ({ x: 22 + i * 62 + ((h >> i) % 9), w: 44 + ((h >> (i + 3)) % 14), hgt: 64 + ((h >> (i + 5)) % 44) }))
  const id = `pa${h}`
  return (
    <svg viewBox="0 0 240 130" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky} /><stop offset="1" stopColor={sky2} /></linearGradient>
        <pattern id={`${id}w`} width="8" height="9" patternUnits="userSpaceOnUse"><rect x="1.5" y="2" width="4.5" height="5" rx=".8" fill="#fff" opacity=".75" /></pattern>
      </defs>
      <rect width="240" height="130" fill={`url(#${id})`} />
      {towers.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={130 - t.hgt} width={t.w} height={t.hgt} fill={tone} opacity={0.88 - i * 0.12} />
          <rect x={t.x} y={130 - t.hgt} width={t.w} height={t.hgt} fill={`url(#${id}w)`} />
          <rect x={t.x - 2} y={130 - t.hgt - 3} width={t.w + 4} height="3" fill="#0f172a" opacity=".35" />
        </g>
      ))}
      {crane && (
        <g stroke="#0f172a" strokeWidth="1.6" fill="none" opacity=".7">
          <path d="M212 130V28M196 28h40M212 28l-14 10M212 28l12 8M226 28v16" />
        </g>
      )}
      <rect y="122" width="240" height="8" fill="#0f172a" opacity=".18" />
    </svg>
  )
}
