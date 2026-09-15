import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (p: IconProps) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  width: 22,
  height: 22,
  'aria-hidden': true,
  ...p,
})

/* ── Tipos de evento ─────────────────────────────────────────────── */

export const BottleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 2h4M9.5 5h5M8.5 8.5h7M9 5l-.6 2.2A3 3 0 0 0 8.8 9L9 9.8V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9.8l.2-.8a3 3 0 0 0-.1-1.8L15 5" />
    <path d="M9 13h6M9 16.5h6" />
  </svg>
)

export const DiaperIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7h18v3a9 9 0 0 1-9 9 9 9 0 0 1-9-9V7Z" />
    <path d="M3 10h4.5c1.2 0 2.2.9 2.4 2.1l.3 2M21 10h-4.5c-1.2 0-2.2.9-2.4 2.1l-.3 2" />
  </svg>
)

export const PillIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-25 12 12)" />
    <path d="M9 14.8 15 9.2" />
  </svg>
)

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
  </svg>
)

export const RulerIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 14.5 14.5 3.5l6 6-11 11z" />
    <path d="M7 11l1.8 1.8M10 8l1.8 1.8M13 5l1.8 1.8" />
  </svg>
)

export const NoteIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v10.5L15 20.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z" />
    <path d="M20.5 15.5H16a.5.5 0 0 0-.5.5v4.5M7.5 8.5h9M7.5 12h6" />
  </svg>
)

/* ── Navegação ───────────────────────────────────────────────────── */

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.5 20v-5h5v5" />
  </svg>
)

export const HistoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3" />
    <path d="M3.5 4v4h4M12 7.5V12l3 2" />
  </svg>
)

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 20V11M12 20V4M19 20v-6" />
  </svg>
)

export const MoreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
)

/* ── Ações e status ──────────────────────────────────────────────── */

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" strokeWidth={2.2} />
  </svg>
)

export const ChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.5 5 8 12l6.5 7" />
  </svg>
)

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </svg>
)

export const ChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 9.5 12 16l7-6.5" />
  </svg>
)

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17M8 3.5V6M16 3.5V6" />
  </svg>
)

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 8.5h3.2l1.4-2.2h7.8l1.4 2.2h3.2v11H3.5z" />
    <circle cx="12" cy="13.6" r="3.4" />
  </svg>
)

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.5 20h9l1-13.5M10.5 10v6M13.5 10v6" />
  </svg>
)

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="M14.5 5.5 18.5 9.5" />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" strokeWidth={2} />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17.5 19 7" strokeWidth={2.2} />
  </svg>
)

export const StopIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
  </svg>
)

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
)

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.4" />
  </svg>
)

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4 2.8 20h18.4L12 4Z" />
    <path d="M12 10v4M12 17.2v.3" />
  </svg>
)

export const WhatsappIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 20.5 5 16.6a8 8 0 1 1 3 3l-4.5.9Z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1.2-.6 1.2-1.2l-1.6-.8-.9.9c-1-.4-1.9-1.3-2.3-2.3l.9-.9-.8-1.6c-.6 0-1.2.6-1.2 1.2Z" />
  </svg>
)

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7.5 2.9c0 5-7.5 9.6-7.5 9.6Z" />
  </svg>
)

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="3" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
)

export const FilterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 6h17M6.5 12h11M10 18h4" />
  </svg>
)

/* ── Avatares dos bebês ──────────────────────────────────────────── */

/** Rostinho do mockup: toca azul para o Léo, laço rosa para a Clara. */
export function BabyFace({ variant, size = 56 }: { variant: 'leo' | 'clara'; size?: number }) {
  const leo = variant === 'leo'
  const hair = leo ? '#7cb2f0' : '#f9a8d4'
  const hairDark = leo ? '#4f8fe0' : '#f472b6'
  const skin = '#ffe0cc'
  const cheek = leo ? '#f9b3c4' : '#f792b4'

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="34" r="22" fill={skin} />
      {/* cabelo / touca */}
      <path d="M10 32a22 22 0 0 1 44 0c0 1.5-.2 3-.6 4.4-2-8-10.6-13.4-21.4-13.4S12.6 28.4 10.6 36.4A22 22 0 0 1 10 32Z" fill={hair} />
      <path d="M32 10c9.5 0 17.6 6 20.7 14.4-4.4-5.6-11.8-9.2-20.7-9.2s-16.3 3.6-20.7 9.2C14.4 16 22.5 10 32 10Z" fill={hairDark} />
      {leo ? (
        <circle cx="32" cy="9" r="3.4" fill={hairDark} />
      ) : (
        <g fill={hairDark}>
          <circle cx="49" cy="18" r="4.2" />
          <circle cx="54" cy="22" r="3.2" />
        </g>
      )}
      {/* olhos e boca */}
      <g fill="#33404f">
        <circle cx="24" cy="35" r="2.6" />
        <circle cx="40" cy="35" r="2.6" />
      </g>
      <circle cx="17.5" cy="41" r="3.6" fill={cheek} opacity=".75" />
      <circle cx="46.5" cy="41" r="3.6" fill={cheek} opacity=".75" />
      <path
        d="M27.5 43.5c1.3 1.8 3 2.7 4.5 2.7s3.2-.9 4.5-2.7"
        fill="none"
        stroke="#33404f"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
