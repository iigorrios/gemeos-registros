export type Baby = {
  id: number
  name: string
  nickname: string
  photo_url: string | null
  /** `yyyy-MM-dd`, sem fuso — usada para calcular o tempo de vida. */
  birth_date: string | null
}

export type FeedingMethod = 'seio' | 'mamadeira'
export type BreastSide = 'esquerdo' | 'direito' | 'ambos'
export type DiaperType = 'xixi' | 'coco' | 'ambos'

export type Feeding = {
  id: number
  baby_id: number | null
  occurred_at: string
  /** Só na mamadeira; no seio o que se registra é o tempo. */
  amount_ml: number | null
  method: string | null
  /** Só para mamada no seio; nulo na mamadeira e no que vem do WhatsApp. */
  breast_side: string | null
  /** Minutos de mamada no seio; nulo na mamadeira. */
  duration_min: number | null
  notes: string | null
  raw_message_id: number | null
}

export type DiaperEvent = {
  id: number
  baby_id: number | null
  occurred_at: string
  type: string | null
  notes: string | null
  raw_message_id: number | null
}

export type Medication = {
  id: number
  baby_id: number | null
  occurred_at: string
  medication_name: string | null
  dose: string | null
  notes: string | null
  raw_message_id: number | null
}

export type SleepEvent = {
  id: number
  baby_id: number | null
  started_at: string
  ended_at: string | null
  notes: string | null
  raw_message_id: number | null
}

export type GrowthMeasurement = {
  id: number
  baby_id: number | null
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
  notes: string | null
  raw_message_id: number | null
}

export type HealthNote = {
  id: number
  baby_id: number | null
  occurred_at: string
  note: string
  raw_message_id: number | null
}

/** Os seis tipos de registro do app. */
export type EventKind = 'feeding' | 'diaper' | 'medication' | 'sleep' | 'growth' | 'note'

export type EventRow = Feeding | DiaperEvent | Medication | SleepEvent | GrowthMeasurement | HealthNote

/** Item normalizado usado na timeline, na Home e nos relatórios. */
export type TimelineEvent = {
  kind: EventKind
  id: number
  babyId: number | null
  /** Instante UTC que posiciona o evento na linha do tempo. */
  at: string
  title: string
  detail: string | null
  notes: string | null
  /** Veio do WhatsApp (via n8n) em vez do app. */
  fromWhatsapp: boolean
  row: EventRow
}
