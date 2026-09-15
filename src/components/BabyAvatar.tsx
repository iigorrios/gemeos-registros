import { babyAccent } from '../context/BabyContext'
import type { Baby } from '../lib/types'
import { BabyFace } from './icons'

/** Foto do bebê quando houver; senão, o rostinho desenhado. */
export function BabyAvatar({
  baby,
  size = 48,
  ring = false,
}: {
  baby: Baby | undefined
  size?: number
  ring?: boolean
}) {
  const accent = babyAccent(baby)
  const ringClass = ring ? `ring-2 ring-offset-2 ring-offset-surface ${accent.ring}` : ''

  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${accent.soft} ${ringClass}`}
      style={{ width: size, height: size }}
    >
      {baby?.photo_url ? (
        <img
          src={baby.photo_url}
          alt={baby.name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <BabyFace variant={accent.key} size={Math.round(size * 0.92)} />
      )}
    </span>
  )
}
