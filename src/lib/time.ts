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

/**
 * Tempo de vida a partir de `yyyy-MM-dd`, contado em dias civis de Brasilia.
 *
 * A data de nascimento e um `date` puro no banco: nao tem hora nem fuso. Por
 * isso a conta e feita com os numeros do calendario, sem passar por Date com
 * fuso — senao um bebe nascido dia 1 poderia aparecer com um dia a mais ou a
 * menos dependendo do relogio do aparelho.
 */
export function babyAge(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null

  const [ano, mes, dia] = birthDate.split('-').map(Number)
  if (!ano || !mes || !dia) return null

  const hoje = fmt(new Date(), 'yyyy-MM-dd').split('-').map(Number)
  const [anoHoje, mesHoje, diaHoje] = hoje

  // Dias corridos, para os primeiros meses.
  const umDia = 86400000
  const nascimento = Date.UTC(ano, mes - 1, dia)
  const agora = Date.UTC(anoHoje, mesHoje - 1, diaHoje)
  const dias = Math.floor((agora - nascimento) / umDia)

  if (dias < 0) return null
  if (dias === 0) return 'nasceu hoje'

  // Nas primeiras semanas a conta que importa e a de dias, entao ela e o
  // rotulo principal. Depois vira semanas/meses, mas o total em dias segue
  // entre parenteses ate o primeiro ano — e o numero que a pediatra pergunta.
  const totalDias = ` (${plural(dias, 'dia', 'dias')})`
  const comTotal = (texto: string) => (dias < 365 ? texto + totalDias : texto)

  if (dias < 14) return plural(dias, 'dia', 'dias')
  if (dias < 60) {
    const semanas = Math.floor(dias / 7)
    const resto = dias % 7
    return comTotal(
      resto === 0
        ? plural(semanas, 'semana', 'semanas')
        : `${plural(semanas, 'semana', 'semanas')} e ${plural(resto, 'dia', 'dias')}`,
    )
  }

  // Meses completos de calendario + dias restantes.
  let meses = (anoHoje - ano) * 12 + (mesHoje - mes)
  if (diaHoje < dia) meses--

  // Ultimo "aniversario mensal": o dia do nascimento, `meses` meses depois.
  // Quem nasceu dia 31 gruda no ultimo dia dos meses de 30 — senao a data
  // estouraria para o mes seguinte e a conta perderia um dia.
  const alvo = mes - 1 + meses
  const alvoAno = ano + Math.floor(alvo / 12)
  const alvoMes = ((alvo % 12) + 12) % 12
  const ultimoDiaDoMes = new Date(Date.UTC(alvoAno, alvoMes + 1, 0)).getUTCDate()
  const aniversario = Date.UTC(alvoAno, alvoMes, Math.min(dia, ultimoDiaDoMes))
  const restoDias = Math.floor((agora - aniversario) / umDia)

  if (meses < 24) {
    return comTotal(
      restoDias === 0
        ? plural(meses, 'mês', 'meses')
        : `${plural(meses, 'mês', 'meses')} e ${plural(restoDias, 'dia', 'dias')}`,
    )
  }

  const anos = Math.floor(meses / 12)
  const restoMeses = meses % 12
  return restoMeses === 0
    ? plural(anos, 'ano', 'anos')
    : `${plural(anos, 'ano', 'anos')} e ${plural(restoMeses, 'mês', 'meses')}`
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** `yyyy-MM-dd` -> `dd/MM/yyyy`, sem passar por fuso. */
export function fmtBirthDate(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null
  const [ano, mes, dia] = birthDate.split('-')
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : null
}

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

/** Versao curta para caber em legenda: 135 -> "2h15", 45 -> "45min". */
export function humanMinutesShort(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
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
