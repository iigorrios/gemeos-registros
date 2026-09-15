import { useEffect, type ReactNode } from 'react'
import { AlertIcon, CloseIcon } from './icons'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse-soft rounded-2xl bg-surface-2 ${className}`} />
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
        <AlertIcon />
      </span>
      <p className="text-sm font-semibold text-ink-soft">{message}</p>
      {onRetry && (
        <button className="btn bg-surface-2 text-ink" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 opacity-60">{icon}</div>}
      <p className="font-bold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-soft">{hint}</p>}
    </div>
  )
}

/** Bottom sheet no celular, diálogo centralizado no desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-sheet-up relative flex max-h-[92dvh] w-full flex-col rounded-t-4xl bg-surface
          shadow-lift sm:max-w-md sm:rounded-4xl sm:animate-slide-up"
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0 text-lg font-extrabold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-soft transition active:scale-95"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>
        {footer && <div className="safe-bottom border-t border-line/70 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] grid place-items-center p-6">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/45" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" className="card animate-slide-up relative w-full max-w-sm p-6">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-6 flex gap-3">
          <button className="btn flex-1 bg-surface-2 text-ink" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button className="btn flex-1 bg-rose-500 text-white" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Grupo de botões exclusivos (seio/mamadeira, xixi/cocô/ambos…). */
export function SegmentedField<T extends string>({
  label,
  value,
  onChange,
  options,
  accentClass = 'bg-sky-500 text-white',
  error,
}: {
  label?: string
  value: T | null
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
  accentClass?: string
  error?: string
}) {
  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div role="group" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-sm font-bold transition active:scale-[.97] ${
                active ? `${accentClass} border-transparent shadow-card` : 'border-line bg-surface-2/60 text-ink-soft'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1.5 text-sm font-semibold text-rose-500">{error}</p>}
    </div>
  )
}

export function FieldWrap({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm font-semibold text-rose-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}
