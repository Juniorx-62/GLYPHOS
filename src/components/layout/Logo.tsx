import { STROKE, gPath, gSquare, wordmark } from '@brand/geometry'

/** The GLYPHOS wordmark (G with the rubric square), in the current text colour. */
export function Logo({ height = 18, className }: { height?: number; className?: string }) {
  const w = wordmark(2)
  const width = Math.ceil(w.width + 4)
  const sq = w.square
  return (
    <svg viewBox={`0 0 ${width} 24`} height={height} width={(height * width) / 24} className={className} role="img" aria-label="GLYPHOS">
      <path d={w.d} fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={sq.x} y={sq.y} width={sq.size} height={sq.size} rx={sq.rx} style={{ fill: 'var(--color-accent)' }} />
    </svg>
  )
}

/** The symbol alone. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  const sq = gSquare(4)
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d={gPath(4)} fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={sq.x} y={sq.y} width={sq.size} height={sq.size} rx={sq.rx} style={{ fill: 'var(--color-accent)' }} />
    </svg>
  )
}
