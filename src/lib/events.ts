import { supabase } from './supabase'
import { KINDS } from './eventKinds'
import { fmtTime, humanMinutes, sleepMinutes } from './time'
import type {
  DiaperEvent,
  EventKind,
  EventRow,
  Feeding,
  GrowthMeasurement,
  HealthNote,
  Medication,
  SleepEvent,
  TimelineEvent,
} from './types'

/** Converte uma linha crua de qualquer tabela no item unificado da timeline. */
export function normalize(kind: EventKind, row: EventRow): TimelineEvent {
  const base = {
    kind,
    id: row.id,
    babyId: row.baby_id,
    fromWhatsapp: row.raw_message_id != null,
    row,
  }

  switch (kind) {
    case 'feeding': {
      const r = row as Feeding
      const method = r.method === 'seio' ? 'Seio' : r.method === 'mamadeira' ? 'Mamadeira' : null
      const parts = [r.amount_ml != null ? `${formatNumber(r.amount_ml)} ml` : null, method]
      return {
        ...base,
        at: r.occurred_at,
        title: 'Amamentação',
        detail: parts.filter(Boolean).join(' · ') || null,
        notes: r.notes,
      }
    }
    case 'diaper': {
      const r = row as DiaperEvent
      return {
        ...base,
        at: r.occurred_at,
        title: 'Fralda',
        detail: diaperLabel(r.type),
        notes: r.notes,
      }
    }
    case 'medication': {
      const r = row as Medication
      const parts = [r.medication_name, r.dose].filter(Boolean)
      return {
        ...base,
        at: r.occurred_at,
        title: 'Medicamento',
        detail: parts.join(' · ') || null,
        notes: r.notes,
      }
    }
    case 'sleep': {
      const r = row as SleepEvent
      const dur = humanMinutes(sleepMinutes(r.started_at, r.ended_at))
      return {
        ...base,
        at: r.started_at,
        title: r.ended_at ? 'Sono' : 'Dormindo agora',
        detail: r.ended_at
          ? `${fmtTime(r.started_at)} – ${fmtTime(r.ended_at)} · ${dur}`
          : `Desde ${fmtTime(r.started_at)} · ${dur}`,
        notes: r.notes,
      }
    }
    case 'growth': {
      const r = row as GrowthMeasurement
      const parts = [
        r.weight_kg != null ? `${formatNumber(r.weight_kg)} kg` : null,
        r.height_cm != null ? `${formatNumber(r.height_cm)} cm` : null,
      ].filter(Boolean)
      return {
        ...base,
        at: r.measured_at,
        title: 'Medida',
        detail: parts.join(' · ') || null,
        notes: r.notes,
      }
    }
    case 'note': {
      const r = row as HealthNote
      return { ...base, at: r.occurred_at, title: 'Anotação', detail: r.note, notes: null }
    }
  }
}

export const diaperLabel = (type: string | null) =>
  type === 'xixi' ? 'Xixi' : type === 'coco' ? 'Cocô' : type === 'ambos' ? 'Xixi + Cocô' : null

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n)
}

export type Range = { from: string; to: string }

/**
 * Busca um tipo de evento de um bebê (ou de todos) dentro de um intervalo UTC.
 * Sono usa `started_at`; um sono que começou antes do intervalo e ainda está
 * aberto também é incluído, senão o bebê "some" da tela enquanto dorme.
 */
export async function fetchKind(
  kind: EventKind,
  babyId: number | null,
  range?: Range,
  limit = 500,
): Promise<TimelineEvent[]> {
  const { table, timeCol } = KINDS[kind]
  let query = supabase.from(table).select('*').order(timeCol, { ascending: false }).limit(limit)

  if (babyId != null) query = query.eq('baby_id', babyId)
  if (range) {
    if (kind === 'sleep') {
      // started_at < fim  E  (ended_at >= início OU ainda aberto)
      query = query.lt(timeCol, range.to).or(`ended_at.gte.${range.from},ended_at.is.null`)
    } else {
      query = query.gte(timeCol, range.from).lt(timeCol, range.to)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => normalize(kind, row as EventRow))
}

/** Timeline unificada, já ordenada do mais recente para o mais antigo. */
export async function fetchTimeline(
  kinds: EventKind[],
  babyId: number | null,
  range?: Range,
): Promise<TimelineEvent[]> {
  const results = await Promise.all(kinds.map((k) => fetchKind(k, babyId, range)))
  return results.flat().sort((a, b) => b.at.localeCompare(a.at))
}

/** Último evento de um tipo, sem filtro de período. */
export async function fetchLast(kind: EventKind, babyId: number): Promise<TimelineEvent | null> {
  const { table, timeCol } = KINDS[kind]
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('baby_id', babyId)
    .order(timeCol, { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? normalize(kind, data as EventRow) : null
}

/** Sono em aberto (ended_at nulo) do bebê, se houver. */
export async function fetchOpenSleep(babyId: number): Promise<SleepEvent | null> {
  const { data, error } = await supabase
    .from(KINDS.sleep.table)
    .select('*')
    .eq('baby_id', babyId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as SleepEvent) ?? null
}

/**
 * Insere ou atualiza um registro. `raw_message_id` nunca é preenchido pelo app
 * — essa coluna é exclusiva do que chega do WhatsApp via n8n.
 */
export async function saveEvent(
  kind: EventKind,
  values: Record<string, unknown>,
  id?: number,
): Promise<void> {
  const { table } = KINDS[kind]
  if (id != null) {
    const { error } = await supabase.from(table).update(values).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from(table).insert(values)
    if (error) throw error
  }
}

export async function deleteEvent(kind: EventKind, id: number): Promise<void> {
  const { error } = await supabase.from(KINDS[kind].table).delete().eq('id', id)
  if (error) throw error
}
