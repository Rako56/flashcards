import type { ReactNode } from 'react'

/**
 * Render cloze text. Handles the two formats in the bank:
 *
 *  1. `{{c1::resposta}}` (Anki science syntax) — answer embedded.
 *     reveal=false → blank; reveal=true → answer highlighted inline.
 *  2. `{{______}}` / `{{...}}` without a `cN::` prefix (TJSP legacy) —
 *     the braces are just a placeholder; the answer lives in back_text.
 *     Always rendered as a clean blank (nothing to reveal inline).
 *
 * Non-cloze text (no `{{`) is returned as-is — safe no-op, so callers
 * can wrap any flashcard text unconditionally.
 *
 * Pure function (no state/hooks) → usable from Server and Client Components.
 */
const CLOZE_RE = /\{\{(c\d+::)?(.+?)\}\}/g

function Blank({ k }: { k: number }): ReactNode {
  return (
    <span
      key={k}
      className="mx-1 rounded bg-foreground/10 px-3 py-0.5 align-middle font-mono text-sm text-foreground/40"
    >
      ____
    </span>
  )
}

export function renderCloze(text: string, reveal: boolean): ReactNode {
  if (!text.includes('{{')) return text
  const parts: ReactNode[] = []
  let last = 0
  let key = 0
  const re = new RegExp(CLOZE_RE)
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const hasAnswer = Boolean(m[1]) // cN:: prefix → answer-bearing cloze
    const content = m[2] ?? ''
    if (hasAnswer && reveal) {
      parts.push(
        <strong key={key} className="font-semibold text-brand-primary">
          {content}
        </strong>,
      )
    } else {
      parts.push(<Blank key={key} k={key} />)
    }
    last = m.index + m[0].length
    key += 1
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
