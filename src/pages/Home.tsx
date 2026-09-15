import { useState } from 'react'
import { BabyAvatar } from '../components/BabyAvatar'
import { BabyTabs } from '../components/BabyTabs'
import { EventIcon } from '../components/EventIcon'
import { endSleep } from '../components/EventForm'
import { ErrorState, LoadingBlock, Spinner } from '../components/ui'
import { StopIcon } from '../components/icons'
import { babyAccent, babyLabel, useBabies } from '../context/BabyContext'
import { useForms } from '../context/FormContext'
import { useToast } from '../context/ToastContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useTicker } from '../hooks/useOnline'
import { fetchKind, formatNumber } from '../lib/events'
import { ALL_KINDS } from '../lib/eventKinds'
import { errorMessage } from '../lib/supabase'
import { babyAge, brDayKey, fmtDateLong, fmtTime, humanMinutes, sleepMinutes, timeAgo } from '../lib/time'
import type { EventKind, SleepEvent, TimelineEvent } from '../lib/types'

type Summary = {
  last: Partial<Record<EventKind, TimelineEvent>>
  today: TimelineEvent[]
  openSleep: TimelineEvent | undefined
  totalMl: number
  feedCount: number
  diaperCount: number
}

export function Home() {
  const { babies, selected, select, loading: loadingBabies } = useBabies()
  const { create } = useForms()
  const toast = useToast()
  useTicker() // mantém os "há X min" vivos

  const [endingSleep, setEndingSleep] = useState(false)

  // Uma consulta por tipo cobre os dois bebês; o resumo é derivado no cliente.
  const { data, loading, error, reload, realtime, refresh } = useAsyncData(
    () => Promise.all(ALL_KINDS.map((kind) => fetchKind(kind, null, undefined, 200))).then((r) => r.flat()),
    [],
  )

  const focus = babies.find((b) => b.id === selected) ?? babies[0]
  const other = babies.find((b) => b.id !== focus?.id)

  if (loadingBabies || (loading && !data)) {
    return (
      <div className="space-y-4">
        <PageTitle />
        <LoadingBlock rows={3} />
      </div>
    )
  }

  if (error && !data) return <ErrorState message={error} onRetry={reload} />

  const events = data ?? []
  const summary = summarize(events, focus?.id)
  const otherSummary = other ? summarize(events, other.id) : undefined
  const accent = babyAccent(focus)

  const handleEndSleep = async () => {
    const open = summary.openSleep
    if (!open) return
    setEndingSleep(true)
    try {
      await endSleep(open.id)
      toast('Sono encerrado.')
      refresh()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setEndingSleep(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle live={realtime === 'live'} />

      <BabyTabs />

      {/* Estado do sono */}
      {summary.openSleep ? (
        <div className="card flex items-center gap-2.5 border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/10">
          <EventIcon kind="sleep" size="sm" />
          {/* Sem truncate: melhor quebrar em duas linhas do que esconder o horário. */}
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight text-indigo-600 dark:text-indigo-300">
              {babyLabel(focus)} está dormindo
            </p>
            <p className="text-sm text-ink-soft">
              Desde {fmtTime(summary.openSleep.at)} ·{' '}
              {humanMinutes(sleepMinutes((summary.openSleep.row as SleepEvent).started_at, null))}
            </p>
          </div>
          <button
            onClick={() => void handleEndSleep()}
            disabled={endingSleep}
            className="btn shrink-0 gap-1.5 self-center bg-indigo-500 px-3 py-2.5 text-sm text-white"
          >
            {endingSleep ? <Spinner className="h-4 w-4" /> : <StopIcon width={16} height={16} />}
            Encerrar
          </button>
        </div>
      ) : (
        <button
          onClick={() => create('sleep')}
          className="card flex w-full items-center gap-3 p-4 text-left transition active:scale-[.99]"
        >
          <EventIcon kind="sleep" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{babyLabel(focus)} está acordado</p>
            <p className="text-sm text-ink-soft">Toque para registrar o início de um sono</p>
          </div>
        </button>
      )}

      {/* Resumo do bebê em foco */}
      <section className="card p-5">
        <header className="flex items-center gap-3">
          <BabyAvatar baby={focus} size={44} ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className={`text-lg font-extrabold ${accent.text}`}>{babyLabel(focus)}</h2>
              {babyAge(focus?.birth_date) && (
                <span className="text-sm font-bold text-ink-faint">{babyAge(focus?.birth_date)}</span>
              )}
            </div>
            <p className="text-sm text-ink-soft">
              {formatNumber(summary.totalMl)} ml hoje · {summary.feedCount} mamada
              {summary.feedCount === 1 ? '' : 's'} · {summary.diaperCount} fralda
              {summary.diaperCount === 1 ? '' : 's'}
            </p>
          </div>
        </header>

        <div className="mt-4 space-y-2.5">
          <LastRow kind="feeding" label="Última mamada" event={summary.last.feeding} />
          <LastRow kind="diaper" label="Última fralda" event={summary.last.diaper} />
          <LastRow kind="medication" label="Último remédio" event={summary.last.medication} />
          <LastRow kind="note" label="Última anotação" event={summary.last.note} />
        </div>
      </section>

      {/* Atalhos */}
      <section>
        <h3 className="mb-2.5 px-1 font-extrabold">Atalhos</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Shortcut kind="feeding" label="Mamar" onClick={() => create('feeding')} />
          <Shortcut kind="diaper" label="Fralda" onClick={() => create('diaper')} />
          <Shortcut kind="medication" label="Remédio" onClick={() => create('medication')} />
          <Shortcut kind="sleep" label="Sono" onClick={() => create('sleep')} />
          <Shortcut kind="growth" label="Medida" onClick={() => create('growth')} />
          <Shortcut kind="note" label="Anotação" onClick={() => create('note')} />
        </div>
      </section>

      {/* O outro bebê, em versão compacta */}
      {other && otherSummary && (
        <button
          onClick={() => select(other.id)}
          className="card flex w-full items-center gap-3 p-4 text-left transition active:scale-[.99]"
        >
          <BabyAvatar baby={other} size={40} />
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold ${babyAccent(other).text}`}>{babyLabel(other)}</p>
            <p className="truncate text-sm text-ink-soft">
              {otherSummary.openSleep ? 'Dormindo · ' : ''}
              {otherSummary.last.feeding
                ? `Última mamada ${fmtTime(otherSummary.last.feeding.at)}`
                : 'Sem mamadas registradas'}
              {' · '}
              {formatNumber(otherSummary.totalMl)} ml hoje
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-ink-faint">Ver</span>
        </button>
      )}
    </div>
  )
}

function PageTitle({ live }: { live?: boolean }) {
  return (
    <header className="flex items-end justify-between gap-3 px-1">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Hoje</h1>
        <p className="text-sm text-ink-soft">{fmtDateLong(new Date())}</p>
      </div>
      {live && (
        <span className="flex items-center gap-1.5 pb-1 text-xs font-bold text-emerald-500">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-emerald-500" />
          ao vivo
        </span>
      )}
    </header>
  )
}

function LastRow({ kind, label, event }: { kind: EventKind; label: string; event?: TimelineEvent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-3.5 py-3">
      <EventIcon kind={kind} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
          {event && <span className="shrink-0 text-xs font-bold text-ink-faint">{timeAgo(event.at)}</span>}
        </div>
        {event ? (
          // line-clamp porque uma anotação pode ser bem mais longa que "90 ml".
          <p className="line-clamp-2 font-extrabold">
            {fmtTime(event.at)}
            {event.detail && <span className="font-semibold text-ink-soft"> · {event.detail}</span>}
          </p>
        ) : (
          <p className="font-bold text-ink-faint">Sem registro</p>
        )}
      </div>
    </div>
  )
}

function Shortcut({ kind, label, onClick }: { kind: EventKind; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card flex flex-col items-center gap-2 p-3.5 transition active:scale-[.97]"
    >
      <EventIcon kind={kind} />
      <span className="text-xs font-extrabold">{label}</span>
    </button>
  )
}

function summarize(events: TimelineEvent[], babyId: number | undefined): Summary {
  const todayKey = brDayKey(new Date())
  const mine = babyId == null ? [] : events.filter((e) => e.babyId === babyId)
  const last: Partial<Record<EventKind, TimelineEvent>> = {}

  for (const e of mine) {
    // `events` já vem ordenado por tempo decrescente dentro de cada tipo.
    if (!last[e.kind]) last[e.kind] = e
  }

  const today = mine.filter((e) => brDayKey(e.at) === todayKey)
  const feedings = today.filter((e) => e.kind === 'feeding')

  return {
    last,
    today,
    openSleep: mine.find((e) => e.kind === 'sleep' && (e.row as SleepEvent).ended_at == null),
    totalMl: feedings.reduce((sum, e) => sum + Number((e.row as { amount_ml: number | null }).amount_ml ?? 0), 0),
    feedCount: feedings.length,
    diaperCount: today.filter((e) => e.kind === 'diaper').length,
  }
}
