/* eslint-disable @next/next/no-img-element */
// Logo files live in public/images/: logo-compact(-dark).png, logo-full(-dark).png, logo-mark(-dark).png
// "dark" = the logo is shown on a LIGHT background (dark text). Default = shown on the dark navy UI (white text).

export function LogoMark({ size = 32, onLight = false }: { size?: number; onLight?: boolean }) {
  return <img src={onLight ? '/images/logo-mark.png' : '/images/logo-mark-dark.png'} alt="SitePilot" height={size} width={Math.round(size * 1.04)} style={{ height: size, width: 'auto' }} />
}

export function Logo({ dark = false, full = false, height = 40 }: { dark?: boolean; sub?: boolean; full?: boolean; height?: number }) {
  const variant = full ? 'logo-full' : 'logo-compact'
  const ratio = full ? 1200 / 340 : 1000 / 282
  return (
    <img
      src={`/images/${variant}${dark ? '' : '-dark'}.png`}
      alt="SitePilot by Evynta — Construction & Site Management"
      height={height} width={Math.round(height * ratio)}
      style={{ height, width: 'auto' }}
    />
  )
}
