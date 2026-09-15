import type { EventKind } from './types'

/**
 * Cor fixa por tipo de evento, igual no tema claro e no escuro.
 * mamadeira = azul claro · fralda = rosa claro · remédio = rosa forte
 * sono = roxo/azul escuro · medida = verde · anotação = amarelo
 */
export type KindStyle = {
  label: string
  plural: string
  /** Fundo do ícone em círculo. */
  bubble: string
  /** Cor do traço do ícone. */
  fg: string
  /** Botão/realce sólido. */
  solid: string
  /** Hex usado nos gráficos (Recharts não aceita classe do Tailwind). */
  hex: string
  /** Tabela do Supabase e coluna que posiciona o evento no tempo. */
  table: string
  timeCol: string
}

export const KINDS: Record<EventKind, KindStyle> = {
  feeding: {
    label: 'Amamentação',
    plural: 'Amamentações',
    bubble: 'bg-sky-100 dark:bg-sky-400/15',
    fg: 'text-sky-600 dark:text-sky-300',
    solid: 'bg-sky-500 text-white',
    hex: '#0ea5e9',
    table: 'gemeos_feedings',
    timeCol: 'occurred_at',
  },
  diaper: {
    label: 'Fralda',
    plural: 'Fraldas',
    bubble: 'bg-pink-100 dark:bg-pink-400/15',
    fg: 'text-pink-500 dark:text-pink-300',
    solid: 'bg-pink-500 text-white',
    hex: '#f472b6',
    table: 'gemeos_diaper_events',
    timeCol: 'occurred_at',
  },
  medication: {
    label: 'Medicamento',
    plural: 'Medicamentos',
    bubble: 'bg-rose-100 dark:bg-rose-500/20',
    fg: 'text-rose-600 dark:text-rose-300',
    solid: 'bg-rose-500 text-white',
    hex: '#e11d48',
    table: 'gemeos_medications',
    timeCol: 'occurred_at',
  },
  sleep: {
    label: 'Sono',
    plural: 'Sonos',
    bubble: 'bg-indigo-100 dark:bg-indigo-400/15',
    fg: 'text-indigo-600 dark:text-indigo-300',
    solid: 'bg-indigo-500 text-white',
    hex: '#6366f1',
    table: 'gemeos_sleep_events',
    timeCol: 'started_at',
  },
  growth: {
    label: 'Medida',
    plural: 'Medidas',
    bubble: 'bg-emerald-100 dark:bg-emerald-400/15',
    fg: 'text-emerald-600 dark:text-emerald-300',
    solid: 'bg-emerald-500 text-white',
    hex: '#10b981',
    table: 'gemeos_growth_measurements',
    timeCol: 'measured_at',
  },
  note: {
    label: 'Anotação',
    plural: 'Anotações',
    bubble: 'bg-amber-100 dark:bg-amber-400/15',
    fg: 'text-amber-600 dark:text-amber-300',
    solid: 'bg-amber-500 text-white',
    hex: '#f59e0b',
    table: 'gemeos_health_notes',
    timeCol: 'occurred_at',
  },
}

export const ALL_KINDS: EventKind[] = ['feeding', 'diaper', 'medication', 'sleep', 'growth', 'note']

/** Todas as tabelas que o Realtime precisa observar. */
export const EVENT_TABLES = ALL_KINDS.map((k) => KINDS[k].table)

export const kindByTable = (table: string): EventKind | undefined =>
  ALL_KINDS.find((k) => KINDS[k].table === table)
