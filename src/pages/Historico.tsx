import { useMemo, useState } from 'react'
import { BabyTabs } from '../components/BabyTabs'
import { EventIcon } from '../components/EventIcon'
import { CalendarIcon, PencilIcon, TrashIcon, WhatsappIcon } from '../components/icons'
import { ConfirmDialog, EmptyState, ErrorState, LoadingBlock } from '../components/ui'
import { useBabies } from '../context/BabyContext'
import { useForms } from '../context/FormContext'
import { useToast } from '../context/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { deleteEvent, fetchTimeline } from '../lib/events'
import { ALL_KINDS, KINDS } from '../lib/eventKinds'
import { errorMessage } from '../lib/supabase'
import {
  brCustomRange,
  brDayKey,
  brDayRange,
  brRangeLastDays,
  fmtDateLong,
  fmtTime,
  todayInput,
} from '../lib/time'
import type { EventKind, TimelineEvent } from '../lib/types'

type Period = 'hoje' | '7' | '30' | 'custom'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'custom', label: 'Período' },
]

export function Historico() {
  const { selected } = useBabies()
  const { edit } = useForms()
  const toast = useToast()

  const [period, setPeriod] = useState<Period>('hoje')
  const [from, setFrom] = useState(todayInput())
  const [to, setTo] = useState(todayInput())
  const [kinds, setKinds] = useState<EventKind[]>(ALL_KINDS)
  const [pendingDelete, setPendingDelete] = useState<TimelineEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const range = useMemo(() => {
    if (period === 'hoje') return brDayRange(0)
    if (period === '7') return brRangeLastDays(7)
    if (period === '30') return brRangeLastDays(30)
    return brCustomRange(from, to)
  }, [period, from, to])

  const { data, loading, error, reload, refresh, realtime } = useAsyncData(
    () => fetchTimeline(ALL_KINDS, selected, range),
    [selected, range.from, range.to],
  )

  const visible = (data ?? []).filter((e) => kinds.includes(e.kind))
  const groups = groupByDay(visible)

  const toggleKind = (kind: EventKind) =>
    setKinds((current) =>
      current.includes(kind)
        ? current.length === 1
          ? current // nunca deixa a lista vazia
          : current.filter((k) => k !== kind)
        : [...current, kind],
    )

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteEvent(pendingDelete.kind, pendingDelete.id)
      toast('Registro excluído.')
      setPendingDelete(null)
      refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3 px-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Histórico</h1>
        {realtime === 'live' && (
          <span className="flex items-center gap-1.5 pb-1 text-xs font-bold text-emerald-500">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-500" />
            ao vivo
          </span>
        )}
      </header>

      <BabyTabs allowBoth />

      {/* Período */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`chip ${period === p.key ? 'bg-ink text-canvas' : 'bg-surface-2/70 text-ink-soft'}`}
          >
            {p.key === 'custom' && <CalendarIcon width={14} height={14} className="mr-1 inline align-[-2px]" />}
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="card flex items-center gap-2 p-3">
          <input
            type="date"
            className="field py-2"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Data inicial"
          />
          <span className="text-ink-faint">até</span>
          <input
            type="date"
            className="field py-2"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Data final"
          />
        </div>
      )}

      {/* Filtro por tipo */}
      <div className="flex flex-wrap gap-2">
        {ALL_KINDS.map((kind) => {
          const active = kinds.includes(kind)
          const style = KINDS[kind]
          return (
            <button
              key={kind}
              onClick={() => toggleKind(kind)}
              aria-pressed={active}
              className={`chip flex items-center gap-1.5 ${
                active ? `${style.bubble} ${style.fg}` : 'bg-surface-2/50 text-ink-faint'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? 'opacity-100' : 'opacity-30'}`} style={{ background: style.hex }} />
              {style.label}
            </button>
          )
        })}
      </div>

      {loading && !data && <LoadingBlock rows={4} />}
      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {data && visible.length === 0 && (
        <EmptyState
          title="Nada registrado neste período"
          hint="Use o botão + para adicionar um registro, ou mande no grupo do WhatsApp."
        />
      )}

      <div className="space-y-6">
        {groups.map(([dayKey, items]) => (
          <section key={dayKey}>
            <h2 className="mb-2 px-1 text-sm font-extrabold uppercase tracking-wide text-ink-faint">
              {fmtDateLong(items[0].at)}
            </h2>
            <div className="card divide-y divide-line/70 overflow-hidden">
              {items.map((event) => (
                <TimelineRow
                  key={`${event.kind}-${event.id}`}
                  event={event}
                  onEdit={() => edit(event)}
                  onDelete={() => setPendingDelete(event)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Excluir registro?"
        message={
          pendingDelete
            ? `${KINDS[pendingDelete.kind].label} de ${fmtTime(pendingDelete.at)}. Essa ação não pode ser desfeita.`
            : ''
        }
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function TimelineRow({
  event,
  onEdit,
  onDelete,
}: {
  event: TimelineEvent
  onEdit: () => void
  onDelete: () => void
}) {
  const { byId, selected } = useBabies()
  const baby = byId(event.babyId)

  return (
    <div className="flex items-center gap-2.5 p-3.5">
      <span className="w-11 shrink-0 text-sm font-extrabold tabular-nums text-ink-soft">
        {fmtTime(event.at)}
      </span>
      <EventIcon kind={event.kind} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-extrabold leading-tight">
          <span>{event.title}</span>
          {event.fromWhatsapp && (
            <WhatsappIcon width={13} height={13} className="shrink-0 text-emerald-500" aria-label="Veio do WhatsApp" />
          )}
        </p>
        {event.detail && <p className="truncate text-sm text-ink-soft">{event.detail}</p>}
        {event.notes && <p className="truncate text-sm italic text-ink-faint">{event.notes}</p>}
        {selected == null && baby && <p className="text-xs font-bold text-ink-faint">{baby.name}</p>}
      </div>
      <div className="flex shrink-0">
        <button
          onClick={onEdit}
          aria-label={`Editar ${event.title}`}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition active:scale-90 hover:bg-surface-2"
        >
          <PencilIcon width={16} height={16} />
        </button>
        <button
          onClick={onDelete}
          aria-label={`Excluir ${event.title}`}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition active:scale-90 hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-500/15"
        >
          <TrashIcon width={16} height={16} />
        </button>
      </div>
    </div>
  )
}

function groupByDay(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const map = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const key = brDayKey(event.at)
    const list = map.get(key)
    if (list) list.push(event)
    else map.set(key, [event])
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}
