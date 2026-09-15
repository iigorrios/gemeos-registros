import { addDays, differenceInMinutes, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Todo timestamptz no banco esta em UTC. O horario real dos eventos e sempre
 * em Brasilia. Nada aqui usa o fuso do navegador — o app mostra e le horario
 * de Brasilia mesmo se o celular estiver em outro fuso.
 */
export const TZ = 'America/Sao_Paulo'

/** Agora, como Date (instante absoluto — o mesmo em qualquer fuso). */
export const now = () => new Date()

/** UTC ISO -> "dd/MM/yyyy HH:mm" em Brasilia. */
export const fmt = (iso: string | Date, pattern: string) =>
  formatInTimeZone(typeof iso === 'string' ? new Date(iso) : iso, TZ, pattern, { locale: ptBR })

export const fmtTime = (iso: string | Date) => fmt(iso, 'HH:mm')
export const fmtDate = (iso: string | Date) => fmt(iso, 'dd/MM/yyyy')
export const fmtDateLong = (iso: string | Date) => fmt(iso, "d 'de' MMM 'de' yyyy")
export const fmtWeekday = (iso: string | Date) => fmt(iso, 'EEE')
export const fmtDayMonth = (iso: string | Date) => fmt(iso, 'dd/MM')

/** UTC ISO -> valor para <input type="datetime-local"> em horario de Brasilia. */
export const toLocalInput = (iso: string | Date) =>
  fmt(typeof iso === 'string' ? new Date(iso) : iso, "yyyy-MM-dd'T'HH:mm")

/** UTC ISO -> valor para <input type="date"> em horario de Brasilia. */
export const toDateInput = (iso: string | Date) => fmt(iso, 'yyyy-MM-dd')

/** Valor de <input type="datetime-local"> (Brasilia) -> UTC ISO para gravar. */
export const inputToUtcISO = (local: string) => fromZonedTime(local, TZ).toISOString()

/** Valor de <input type="date"> (Brasilia) -> UTC ISO do inicio daquele dia. */
export const dateInputToUtcISO = (localDate: string, time = '12:00') =>
  fromZonedTime(`${localDate}T${time}`, TZ).toISOString()

/** "Hoje" em Brasilia como yyyy-MM-dd. */
export const todayInput = () => toDateInput(new Date())

/**
 * Intervalo [inicio, fim) em UTC ISO de um dia civil de Brasilia.
 * `dayOffset` 0 = hoje, -1 = ontem.
 */
export function brDayRange(dayOffset = 0): { from: string; to: string } {
  const localNow = toZonedTime(new Date(), TZ)
  const localStart = addDays(startOfDay(localNow), dayOffset)
  const from = fromZonedTime(formatLocal(localStart), TZ)
  const to = fromZonedTime(formatLocal(addDays(localStart, 1)), TZ)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Intervalo dos ultimos N dias civis de Brasilia, terminando hoje (inclusive). */
export function brRangeLastDays(days: number): { from: string; to: string } {
  const start = brDayRange(-(days - 1))
  const end = brDayRange(0)
  return { from: start.from, to: end.to }
}

/** Intervalo a partir de dois <input type="date"> (inclusive nas duas pontas). */
export function brCustomRange(fromDate: string, toDate: string): { from: string; to: string } {
  const start = fromZonedTime(`${fromDate}T00:00`, TZ)
  // Fim exclusivo: 00:00 do dia seguinte ao ultimo dia escolhido.
  const endDay = addDays(startOfDay(new Date(`${toDate}T00:00:00`)), 1)
  const end = fromZonedTime(formatLocal(endDay), TZ)
  return { from: start.toISOString(), to: end.toISOString() }
}

/** Lista de dias (yyyy-MM-dd em Brasilia) cobrindo os ultimos N dias. */
export function brLastDayKeys(days: number): string[] {
  const localToday = startOfDay(toZonedTime(new Date(), TZ))
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(localToday, -i)
    const p = (n: number) => String(n).padStart(2, '0')
    keys.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`)
  }
  return keys
}

/** A que dia civil de Brasilia um instante UTC pertence. */
export const brDayKey = (iso: string | Date) => fmt(iso, 'yyyy-MM-dd')

/** Limites [inicio, fim) em UTC de um dia civil de Brasilia (yyyy-MM-dd). */
export function brDayBounds(dayKey: string): { start: Date; end: Date } {
  const start = fromZonedTime(`${dayKey}T00:00`, TZ)
  const next = addDays(startOfDay(new Date(`${dayKey}T00:00:00`)), 1)
  const end = fromZonedTime(formatLocal(next), TZ)
  return { start, end }
}

/** Hora do dia (0-23) em Brasilia. */
export const brHour = (iso: string | Date) => Number(fmt(iso, 'H'))

/** "há 2h 15min" / "agora" — distancia entre um instante passado e agora. */
export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const mins = differenceInMinutes(new Date(), typeof iso === 'string' ? new Date(iso) : iso)
  if (mins < 1) return 'agora'
  return `há ${humanMinutes(mins)}`
}

/** 135 -> "2h 15min" */
export function humanMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/** Duracao de um sono; `ended_at` nulo conta ate agora. */
export function sleepMinutes(startedAt: string, endedAt: string | null): number {
  const end = endedAt ? new Date(endedAt) : new Date()
  return Math.max(0, differenceInMinutes(end, new Date(startedAt)))
}

/** date-fns formata no fuso do runtime; aqui so precisamos do "texto local". */
function formatLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
