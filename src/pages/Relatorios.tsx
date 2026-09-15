import { useMemo, useState, type ReactElement } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BabyAvatar } from '../components/BabyAvatar'
import { BabyTabs } from '../components/BabyTabs'
import { EventIcon } from '../components/EventIcon'
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui'
import { babyAccent, babyLabel, useBabies } from '../context/BabyContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useTicker } from '../hooks/useOnline'
import { fetchKind, formatNumber } from '../lib/events'
import { KINDS } from '../lib/eventKinds'
import {
  brDayBounds,
  brDayKey,
  brDayRange,
  brHour,
  brLastDayKeys,
  brRangeLastDays,
  fmtDayMonth,
  humanMinutes,
  humanMinutesShort,
  timeAgo,
} from '../lib/time'
import { useTheme } from '../context/ThemeContext'
import type { Baby, DiaperEvent, Feeding, GrowthMeasurement, SleepEvent, TimelineEvent } from '../lib/types'

type Period = 'hoje' | '7' | '30'

const PERIOD_DAYS: Record<Period, number> = { hoje: 1, '7': 7, '30': 30 }

export function Relatorios() {
  const { babies, selected } = useBabies()
  const { theme } = useTheme()
  useTicker()

  const [period, setPeriod] = useState<Period>('hoje')

  const range = useMemo(
    () => (period === 'hoje' ? brDayRange(0) : brRangeLastDays(PERIOD_DAYS[period])),
    [period],
  )

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [feedings, diapers, meds, sleeps, growth, lastFeed, lastDiaper] = await Promise.all([
      fetchKind('feeding', selected, range, 1000),
      fetchKind('diaper', selected, range, 1000),
      fetchKind('medication', selected, range, 1000),
      fetchKind('sleep', selected, range, 1000),
      // A evolução de peso/altura ignora o período: é a série inteira.
      fetchKind('growth', selected, undefined, 500),
      fetchKind('feeding', selected, undefined, 1),
      fetchKind('diaper', selected, undefined, 1),
    ])
    return { feedings, diapers, meds, sleeps, growth, lastFeed: lastFeed[0], lastDiaper: lastDiaper[0] }
  }, [selected, range.from, range.to])

  const series = selected == null ? babies : babies.filter((b) => b.id === selected)
  const axis = theme === 'dark' ? '#64748b' : '#94a3b8'
  const grid = theme === 'dark' ? '#25304a' : '#f1e6ec'

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-3xl font-extrabold tracking-tight">Relatórios</h1>

      <BabyTabs allowBoth />

      <div className="flex gap-2">
        {(['hoje', '7', '30'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`chip flex-1 ${period === p ? 'bg-ink text-canvas' : 'bg-surface-2/70 text-ink-soft'}`}
          >
            {p === 'hoje' ? 'Hoje' : `${p} dias`}
          </button>
        ))}
      </div>

      {loading && !data && <LoadingBlock rows={4} />}
      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          {/* Destaques */}
          <div className="grid grid-cols-2 gap-3">
            <HighlightCard
              label="Última mamada"
              value={data.lastFeed ? timeAgo(data.lastFeed.at) : '—'}
              kind="feeding"
            />
            <HighlightCard
              label="Última fralda"
              value={data.lastDiaper ? timeAgo(data.lastDiaper.at) : '—'}
              kind="diaper"
            />
          </div>

          {/* Totais */}
          <section className="card p-5">
            <h2 className="font-extrabold">
              {period === 'hoje' ? 'Totais de hoje' : `Totais dos últimos ${period} dias`}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Mamadeira" value={`${formatNumber(totalMl(data.feedings))} ml`} hex={KINDS.feeding.hex} />
              <Stat label="Tempo no seio" value={humanMinutes(totalBreastMin(data.feedings))} hex={KINDS.feeding.hex} />
              <Stat label="Mamadas" value={String(data.feedings.length)} hex={KINDS.feeding.hex} />
              <Stat label="Fraldas" value={String(data.diapers.length)} hex={KINDS.diaper.hex} />
              <Stat label="Doses" value={String(data.meds.length)} hex={KINDS.medication.hex} />
              <Stat
                label="Sono"
                value={humanMinutes(totalSleepMin(data.sleeps, PERIOD_DAYS[period], series))}
                hex={KINDS.sleep.hex}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label="Xixi" value={String(countDiaper(data.diapers, 'xixi'))} hex={KINDS.diaper.hex} />
              <Stat label="Cocô" value={String(countDiaper(data.diapers, 'coco'))} hex={KINDS.diaper.hex} />
              <Stat label="Xixi + Cocô" value={String(countDiaper(data.diapers, 'ambos'))} hex={KINDS.diaper.hex} />
            </div>
          </section>

          {/* Intervalo entre mamadas — sempre por bebê: misturar os dois mediria
              os vãos da fila combinada, que não querem dizer nada. */}
          <section className="card p-5">
            <h2 className="font-extrabold">Intervalo entre mamadas</h2>
            <p className="text-sm text-ink-soft">
              média de tempo de uma mamada para a seguinte
              {period === 'hoje' ? ', hoje' : `, nos últimos ${period} dias`}
            </p>

            <div className="mt-4 space-y-2.5">
              {series.map((baby) => {
                const media = avgFeedingInterval(data.feedings, baby.id)
                const accent = babyAccent(baby)
                return (
                  <div key={baby.id} className="rounded-2xl bg-surface-2/60 px-3.5 py-3">
                    <div className="flex items-center gap-3">
                      <BabyAvatar baby={baby} size={34} />
                      <p className={`min-w-0 flex-1 truncate font-extrabold ${accent.text}`}>
                        {babyLabel(baby)}
                      </p>
                      <span
                        className="shrink-0 text-lg font-extrabold tabular-nums"
                        style={{ color: media ? accent.hex : undefined }}
                      >
                        {media ? humanMinutes(media.media) : '—'}
                      </span>
                    </div>
                    {/* Legenda ocupa a linha toda: dividir espaço com o número quebrava o texto. */}
                    <p className="mt-1 pl-[46px] text-sm text-ink-soft">
                      {media
                        ? `${media.intervalos} intervalo${media.intervalos === 1 ? '' : 's'} · de ${humanMinutesShort(media.menor)} a ${humanMinutesShort(media.maior)}`
                        : 'precisa de pelo menos duas mamadas no período'}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Consumo — só mamadeira: no seio o registro é de tempo, não de volume */}
          <ChartCard
            title="Mamadeira"
            subtitle={period === 'hoje' ? 'ml por faixa de horário' : 'ml por dia'}
          >
            <BarChart data={feedingChartData(data.feedings, period, series)}>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} />
              <YAxis width={38} tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} />
              <Tooltip content={<ChartTooltip suffix=" ml" />} cursor={{ fill: grid, opacity: 0.4 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((baby) => (
                <Bar
                  key={baby.id}
                  dataKey={String(baby.id)}
                  name={babyLabel(baby)}
                  fill={series.length > 1 ? babyAccent(baby).hex : KINDS.feeding.hex}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ChartCard>

          {/* Sono */}
          <ChartCard title="Sono" subtitle="horas dormidas por dia (sono em aberto conta até agora)">
            <BarChart data={sleepChartData(data.sleeps, PERIOD_DAYS[period], series)}>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} />
              <YAxis
                width={38}
                tickLine={false}
                axisLine={false}
                tick={{ fill: axis, fontSize: 11 }}
                unit="h"
              />
              <Tooltip content={<ChartTooltip suffix=" h" />} cursor={{ fill: grid, opacity: 0.4 }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((baby) => (
                <Bar
                  key={baby.id}
                  dataKey={String(baby.id)}
                  name={babyLabel(baby)}
                  fill={series.length > 1 ? babyAccent(baby).hex : KINDS.sleep.hex}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ChartCard>

          {/* Crescimento */}
          {data.growth.length === 0 ? (
            <section className="card p-5">
              <h2 className="font-extrabold">Crescimento</h2>
              <EmptyState
                title="Nenhuma medida registrada"
                hint="Registre peso e altura das consultas pediátricas pelo botão +."
                icon={<EventIcon kind="growth" size="lg" />}
              />
            </section>
          ) : (
            <>
              <ChartCard title="Peso" subtitle="kg ao longo do tempo">
                <LineChart data={growthChartData(data.growth, 'weight_kg', series)}>
                  <CartesianGrid vertical={false} stroke={grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} />
                  <YAxis width={44} tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip suffix=" kg" />} />
                  {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {series.map((baby) => (
                    <Line
                      key={baby.id}
                      type="monotone"
                      dataKey={String(baby.id)}
                      name={babyLabel(baby)}
                      stroke={series.length > 1 ? babyAccent(baby).hex : KINDS.growth.hex}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ChartCard>

              <ChartCard title="Altura" subtitle="cm ao longo do tempo">
                <LineChart data={growthChartData(data.growth, 'height_cm', series)}>
                  <CartesianGrid vertical={false} stroke={grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} />
                  <YAxis width={44} tickLine={false} axisLine={false} tick={{ fill: axis, fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip suffix=" cm" />} />
                  {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {series.map((baby) => (
                    <Line
                      key={baby.id}
                      type="monotone"
                      dataKey={String(baby.id)}
                      name={babyLabel(baby)}
                      stroke={series.length > 1 ? babyAccent(baby).hex : '#059669'}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ChartCard>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── Blocos ──────────────────────────────────────────────────────── */

function HighlightCard({ label, value, kind }: { label: string; value: string; kind: 'feeding' | 'diaper' }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <EventIcon kind={kind} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="truncate text-lg font-extrabold">{value}</p>
      </div>
    </div>
  )
}

function Stat({ label, value, hex }: { label: string; value: string; hex: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/60 p-3.5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold" style={{ color: hex }}>
        {value}
      </p>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactElement
}) {
  return (
    <section className="card p-5">
      <h2 className="font-extrabold">{title}</h2>
      <p className="text-sm text-ink-soft">{subtitle}</p>
      <div className="mt-4 h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  suffix: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm shadow-lift">
      <p className="font-extrabold">{label}</p>
      {payload.map((item, i) => (
        <p key={i} style={{ color: item.color }} className="font-semibold">
          {item.name}: {formatNumber(item.value ?? 0)}
          {suffix}
        </p>
      ))}
    </div>
  )
}

/* ── Agregações ──────────────────────────────────────────────────── */

const totalMl = (feedings: TimelineEvent[]) =>
  feedings.reduce((sum, e) => sum + Number((e.row as Feeding).amount_ml ?? 0), 0)

/**
 * Média do tempo entre mamadas consecutivas de UM bebê, dentro do período.
 *
 * Nunca some os dois bebês: os eventos vêm intercalados, e o vão entre uma
 * mamada do Léo e a seguinte da Clara não significa nada.
 */
function avgFeedingInterval(
  feedings: TimelineEvent[],
  babyId: number,
): { media: number; menor: number; maior: number; intervalos: number } | null {
  const momentos = feedings
    .filter((e) => e.babyId === babyId)
    .map((e) => new Date(e.at).getTime())
    .sort((a, b) => a - b)

  if (momentos.length < 2) return null

  const vaos: number[] = []
  for (let i = 1; i < momentos.length; i++) vaos.push((momentos[i] - momentos[i - 1]) / 60000)

  return {
    media: vaos.reduce((soma, v) => soma + v, 0) / vaos.length,
    menor: Math.min(...vaos),
    maior: Math.max(...vaos),
    intervalos: vaos.length,
  }
}

const totalBreastMin = (feedings: TimelineEvent[]) =>
  feedings.reduce((sum, e) => sum + Number((e.row as Feeding).duration_min ?? 0), 0)

/** Soma as horas ja repartidas por dia, para nao contar sono em dobro. */
const totalSleepMin = (sleeps: TimelineEvent[], days: number, series: Baby[]) =>
  sleepChartData(sleeps, days, series).reduce(
    (sum, row) => sum + series.reduce((s, b) => s + Number(row[String(b.id)] ?? 0), 0) * 60,
    0,
  )

const countDiaper = (diapers: TimelineEvent[], type: string) =>
  diapers.filter((e) => (e.row as DiaperEvent).type === type).length

type Row = Record<string, string | number> & { label: string }

/** Hoje: ml por faixa de 3h. Períodos maiores: ml por dia. */
function feedingChartData(feedings: TimelineEvent[], period: Period, series: Baby[]): Row[] {
  if (period === 'hoje') {
    const buckets = [0, 3, 6, 9, 12, 15, 18, 21]
    return buckets.map((hour) => {
      const row: Row = { label: `${hour}h` }
      for (const baby of series) {
        row[String(baby.id)] = feedings
          .filter((e) => e.babyId === baby.id && Math.floor(brHour(e.at) / 3) * 3 === hour)
          .reduce((sum, e) => sum + Number((e.row as Feeding).amount_ml ?? 0), 0)
      }
      return row
    })
  }

  const days = brLastDayKeys(PERIOD_DAYS[period])
  return days.map((dayKey) => {
    const row: Row = { label: fmtDayMonth(brDayBounds(dayKey).start) }
    for (const baby of series) {
      row[String(baby.id)] = feedings
        .filter((e) => e.babyId === baby.id && brDayKey(e.at) === dayKey)
        .reduce((sum, e) => sum + Number((e.row as Feeding).amount_ml ?? 0), 0)
    }
    return row
  })
}

/**
 * Horas dormidas por dia. Um sono que atravessa a meia-noite é repartido entre
 * os dois dias; um sono ainda em aberto conta até agora.
 */
function sleepChartData(sleeps: TimelineEvent[], days: number, series: Baby[]): Row[] {
  const keys = brLastDayKeys(days)
  return keys.map((dayKey) => {
    const { start, end } = brDayBounds(dayKey)
    const row: Row = { label: days === 1 ? 'Hoje' : fmtDayMonth(start) }
    for (const baby of series) {
      const minutes = sleeps
        .filter((e) => e.babyId === baby.id)
        .reduce((sum, e) => {
          const sleep = e.row as SleepEvent
          const from = new Date(sleep.started_at).getTime()
          const to = sleep.ended_at ? new Date(sleep.ended_at).getTime() : Date.now()
          const overlap = Math.min(to, end.getTime()) - Math.max(from, start.getTime())
          return sum + Math.max(0, overlap) / 60000
        }, 0)
      row[String(baby.id)] = Math.round((minutes / 60) * 10) / 10
    }
    return row
  })
}

/** Uma linha por bebê, no eixo de datas das medições. */
function growthChartData(
  growth: TimelineEvent[],
  field: 'weight_kg' | 'height_cm',
  series: Baby[],
): Row[] {
  const byDay = new Map<string, Row>()
  const ordered = [...growth].sort((a, b) => a.at.localeCompare(b.at))

  for (const event of ordered) {
    const value = (event.row as GrowthMeasurement)[field]
    if (value == null) continue
    const dayKey = brDayKey(event.at)
    const row = byDay.get(dayKey) ?? { label: fmtDayMonth(event.at) }
    if (series.some((b) => b.id === event.babyId)) row[String(event.babyId)] = Number(value)
    byDay.set(dayKey, row)
  }

  return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, row]) => row)
}
