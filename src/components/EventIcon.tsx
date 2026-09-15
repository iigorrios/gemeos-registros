import { KINDS } from '../lib/eventKinds'
import type { EventKind } from '../lib/types'
import { BottleIcon, DiaperIcon, MoonIcon, NoteIcon, PillIcon, RulerIcon } from './icons'

const GLYPH = {
  feeding: BottleIcon,
  diaper: DiaperIcon,
  medication: PillIcon,
  sleep: MoonIcon,
  growth: RulerIcon,
  note: NoteIcon,
} as const

export function EventGlyph({ kind, size = 22 }: { kind: EventKind; size?: number }) {
  const Glyph = GLYPH[kind]
  return <Glyph width={size} height={size} />
}

/** Ícone em círculo colorido — a cor é fixa por tipo em todo o app. */
export function EventIcon({
  kind,
  size = 'md',
  className = '',
}: {
  kind: EventKind
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const style = KINDS[kind]
  const box = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  const glyph = size === 'sm' ? 18 : size === 'lg' ? 28 : 22

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${box} ${style.bubble} ${style.fg} ${className}`}
    >
      <EventGlyph kind={kind} size={glyph} />
    </span>
  )
}
