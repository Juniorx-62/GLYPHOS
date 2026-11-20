/**
 * Read-only code with light highlighting for SVG/JSX/CSS. The highlighter
 * only wraps tokens of text that is already escaped; it never injects markup
 * from the code itself.
 */
import { useMemo, type ReactNode } from 'react'
import { cn } from '~/lib/utils'

const TOKEN = /(<\/?[a-zA-Z][\w.-]*|\/?>)|([a-zA-Z_:][-\w:.]*)(?==)|("[^"]*"|'[^']*'|`[^`]*`)|([{}()[\];,])/g

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out.push(code.slice(last, m.index))
    const cls = m[1] ? 'tok-tag' : m[2] ? 'tok-attr' : m[3] ? 'tok-str' : 'tok-punct'
    out.push(
      <span key={key++} className={cls}>
        {m[0]}
      </span>,
    )
    last = m.index! + m[0].length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}

export function CodeBlock({ code, label, className, wrap = false }: { code: string; label: string; className?: string; wrap?: boolean }) {
  const nodes = useMemo(() => highlight(code), [code])
  return (
    <pre
      tabIndex={0}
      aria-label={label}
      className={cn('code-surface max-h-80 overflow-auto rounded-lg border border-border bg-background-subtle p-4 text-fg', wrap ? 'break-all whitespace-pre-wrap' : 'whitespace-pre', className)}
    >
      <code>{nodes}</code>
    </pre>
  )
}
