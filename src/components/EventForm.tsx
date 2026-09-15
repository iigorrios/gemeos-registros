import { useEffect, useState } from 'react'
import { babyAccent, babyLabel, useBabies } from '../context/BabyContext'
import { useToast } from '../context/ToastContext'
import { useOnline } from '../hooks/useOnline'
import { deleteEvent, saveEvent } from '../lib/events'
import { KINDS } from '../lib/eventKinds'
import { errorMessage, supabase } from '../lib/supabase'
import { inputToUtcISO, toLocalInput } from '../lib/time'
import type {
  BreastSide,
  DiaperEvent,
  DiaperType,
  EventKind,
  Feeding,
  FeedingMethod,
  GrowthMeasurement,
  HealthNote,
  Medication,
  SleepEvent,
  TimelineEvent,
} from '../lib/types'
import { BabyAvatar } from './BabyAvatar'
import { EventIcon } from './EventIcon'
import { AlertIcon, BottleIcon, DiaperIcon, MoonIcon } from './icons'
import { ConfirmDialog, FieldWrap, SegmentedField, Sheet, Spinner } from './ui'

type Props = {
  open: boolean
  kind: EventKind
  /** Preenchido quando é edição de um registro existente. */
  event?: TimelineEvent
  onClose: () => void
}

type Errors = Record<string, string>

export function EventForm({ open, kind, event, onClose }: Props) {
  const { babies, selected } = useBabies()
  const toast = useToast()
  const online = useOnline()

  const isEdit = event != null
  const style = KINDS[kind]

  const [babyId, setBabyId] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [medNames, setMedNames] = useState<string[]>([])

  // (Re)inicializa o formulário sempre que abre.
  useEffect(() => {
    if (!open) return
    setErrors({})
    setBabyId(event?.babyId ?? selected ?? babies[0]?.id ?? null)
    setValues(initialValues(kind, event))
  }, [open, kind, event, selected, babies])

  // Sugestões de medicamento já usados.
  useEffect(() => {
    if (!open || kind !== 'medication') return
    void supabase
      .from(KINDS.medication.table)
      .select('medication_name')
      .not('medication_name', 'is', null)
      .order('occurred_at', { ascending: false })
      .limit(80)
      .then(({ data }) => {
        const names = Array.from(
          new Set((data ?? []).map((r) => (r as { medication_name: string }).medication_name?.trim()).filter(Boolean)),
        )
        setMedNames(names as string[])
      })
  }, [open, kind])

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e))
  }

  const accent = babyAccent(babies.find((b) => b.id === babyId))

  const handleSave = async () => {
    const found = validate(kind, values, babyId)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    if (!online) {
      toast('Sem internet — o registro não foi salvo.', 'error')
      return
    }

    setSaving(true)
    try {
      // raw_message_id e ai_classification ficam de fora: são só do WhatsApp.
      await saveEvent(kind, toRow(kind, values, babyId!), event?.id)
      toast(isEdit ? 'Registro atualizado.' : `${style.label} registrada.`)
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    setDeleting(true)
    try {
      await deleteEvent(kind, event.id)
      toast('Registro excluído.')
      setConfirmDelete(false)
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const title = (
    <span className="flex items-center gap-2.5">
      <EventIcon kind={kind} size="sm" />
      <span className="truncate">
        {isEdit ? `Editar ${style.label.toLowerCase()}` : `Registrar ${style.label.toLowerCase()}`}
      </span>
    </span>
  )

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        footer={
          <div className="flex gap-3">
            {isEdit && (
              <button
                type="button"
                className="btn bg-surface-2 text-rose-500"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                Excluir
              </button>
            )}
            <button
              type="button"
              className={`btn flex-1 ${accent.btn}`}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <Spinner /> : 'Salvar'}
            </button>
          </div>
        }
      >
        <form
          className="space-y-4 pb-2"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
        >
          {/* Bebê */}
          {babies.length > 1 && (
            <div>
              <span className="label">Bebê</span>
              <div className="grid grid-cols-2 gap-2">
                {babies.map((b) => {
                  const a = babyAccent(b)
                  const active = babyId === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBabyId(b.id)}
                      aria-pressed={active}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-extrabold transition active:scale-[.97] ${
                        active ? `${a.btn} border-transparent shadow-card` : 'border-line bg-surface-2/60 text-ink-soft'
                      }`}
                    >
                      <BabyAvatar baby={b} size={22} />
                      {babyLabel(b)}
                    </button>
                  )
                })}
              </div>
              {errors.babyId && <p className="mt-1.5 text-sm font-semibold text-rose-500">{errors.babyId}</p>}
            </div>
          )}

          {kind === 'feeding' && (
            <>
              <SegmentedField<FeedingMethod>
                label="Método"
                value={(values.method as FeedingMethod) || null}
                onChange={(v) => set('method', v)}
                accentClass="bg-sky-500 text-white"
                error={errors.method}
                options={[
                  { value: 'seio', label: 'Seio' },
                  { value: 'mamadeira', label: 'Mamadeira', icon: <BottleIcon width={18} height={18} /> },
                ]}
              />
              {values.method === 'seio' && (
                <SegmentedField<BreastSide>
                  label="Qual seio"
                  value={(values.breast_side as BreastSide) || null}
                  onChange={(v) => set('breast_side', v)}
                  accentClass="bg-sky-500 text-white"
                  error={errors.breast_side}
                  options={[
                    { value: 'esquerdo', label: 'Esquerdo' },
                    { value: 'direito', label: 'Direito' },
                    { value: 'ambos', label: 'Ambos' },
                  ]}
                />
              )}
              <FieldWrap
                label="Quantidade (ml)"
                error={errors.amount_ml}
                hint={values.method === 'seio' ? 'Opcional para mamada no seio.' : undefined}
              >
                <Stepper value={values.amount_ml ?? ''} onChange={(v) => set('amount_ml', v)} step={10} suffix="ml" />
              </FieldWrap>
              <DateTimeField
                label="Horário"
                value={values.occurred_at ?? ''}
                onChange={(v) => set('occurred_at', v)}
                error={errors.occurred_at}
              />
              <NotesField value={values.notes ?? ''} onChange={(v) => set('notes', v)} />
            </>
          )}

          {kind === 'diaper' && (
            <>
              <SegmentedField<DiaperType>
                label="Tipo"
                value={(values.type as DiaperType) || null}
                onChange={(v) => set('type', v)}
                accentClass="bg-pink-500 text-white"
                error={errors.type}
                options={[
                  { value: 'xixi', label: 'Xixi', icon: <DiaperIcon width={18} height={18} /> },
                  { value: 'coco', label: 'Cocô', icon: <DiaperIcon width={18} height={18} /> },
                  { value: 'ambos', label: 'Xixi + Cocô', icon: <DiaperIcon width={18} height={18} /> },
                ]}
              />
              <DateTimeField
                label="Horário"
                value={values.occurred_at ?? ''}
                onChange={(v) => set('occurred_at', v)}
                error={errors.occurred_at}
              />
              <NotesField
                value={values.notes ?? ''}
                onChange={(v) => set('notes', v)}
                placeholder="Ex: consistência, cor, etc."
              />
            </>
          )}

          {kind === 'medication' && (
            <>
              <FieldWrap label="Medicamento" error={errors.medication_name}>
                <input
                  className="field"
                  list="med-names"
                  value={values.medication_name ?? ''}
                  onChange={(e) => set('medication_name', e.target.value)}
                  placeholder="Ex: Vitamina D"
                  autoComplete="off"
                />
                <datalist id="med-names">
                  {medNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </FieldWrap>
              <FieldWrap label="Dose" error={errors.dose}>
                <input
                  className="field"
                  value={values.dose ?? ''}
                  onChange={(e) => set('dose', e.target.value)}
                  placeholder="Ex: 1 gota"
                />
              </FieldWrap>
              <DateTimeField
                label="Horário"
                value={values.occurred_at ?? ''}
                onChange={(v) => set('occurred_at', v)}
                error={errors.occurred_at}
              />
              <NotesField
                value={values.notes ?? ''}
                onChange={(v) => set('notes', v)}
                placeholder="Ex: reação, observações..."
              />
            </>
          )}

          {kind === 'sleep' && (
            <>
              <DateTimeField
                label="Início do sono"
                value={values.started_at ?? ''}
                onChange={(v) => set('started_at', v)}
                error={errors.started_at}
              />
              <div>
                <DateTimeField
                  label="Fim do sono"
                  value={values.ended_at ?? ''}
                  onChange={(v) => set('ended_at', v)}
                  error={errors.ended_at}
                />
                {values.ended_at ? (
                  <button
                    type="button"
                    className="mt-2 text-sm font-bold text-indigo-500"
                    onClick={() => set('ended_at', '')}
                  >
                    Deixar em aberto (ainda dormindo)
                  </button>
                ) : (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-faint">
                    <MoonIcon width={15} height={15} /> Em aberto — o bebê aparece como “dormindo agora”.
                  </p>
                )}
              </div>
              <NotesField value={values.notes ?? ''} onChange={(v) => set('notes', v)} />
            </>
          )}

          {kind === 'growth' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Peso (kg)" error={errors.weight_kg}>
                  <input
                    className="field"
                    inputMode="decimal"
                    value={values.weight_kg ?? ''}
                    onChange={(e) => set('weight_kg', e.target.value)}
                    placeholder="Ex: 4,250"
                  />
                </FieldWrap>
                <FieldWrap label="Altura (cm)" error={errors.height_cm}>
                  <input
                    className="field"
                    inputMode="decimal"
                    value={values.height_cm ?? ''}
                    onChange={(e) => set('height_cm', e.target.value)}
                    placeholder="Ex: 54,5"
                  />
                </FieldWrap>
              </div>
              {errors.measures && <p className="-mt-2 text-sm font-semibold text-rose-500">{errors.measures}</p>}
              <DateTimeField
                label="Data da medição"
                value={values.measured_at ?? ''}
                onChange={(v) => set('measured_at', v)}
                error={errors.measured_at}
              />
              <NotesField
                value={values.notes ?? ''}
                onChange={(v) => set('notes', v)}
                placeholder="Ex: consulta com a pediatra"
              />
            </>
          )}

          {kind === 'note' && (
            <>
              <FieldWrap label="Anotação" error={errors.note}>
                <textarea
                  className="field min-h-[110px] resize-y"
                  value={values.note ?? ''}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="Ex: sentiu cólica, irritado à noite..."
                />
              </FieldWrap>
              <DateTimeField
                label="Horário"
                value={values.occurred_at ?? ''}
                onChange={(v) => set('occurred_at', v)}
                error={errors.occurred_at}
              />
            </>
          )}

          {!online && (
            <p className="flex items-center gap-2 rounded-2xl bg-amber-100 px-3.5 py-2.5 text-sm font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
              <AlertIcon width={16} height={16} /> Você está sem internet. Não dá para salvar agora.
            </p>
          )}

          {event?.fromWhatsapp && (
            <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-ink-soft">
              Este registro veio do WhatsApp. Editar aqui altera os dados, mas mantém o vínculo com a mensagem original.
            </p>
          )}

          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir registro?"
        message="Essa ação não pode ser desfeita."
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

/* ── Campos auxiliares ───────────────────────────────────────────── */

function DateTimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <FieldWrap label={label} error={error} hint={error ? undefined : 'Horário de Brasília'}>
      <input
        type="datetime-local"
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldWrap>
  )
}

function NotesField({
  value,
  onChange,
  placeholder = 'Opcional',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <FieldWrap label="Observação (opcional)">
      <textarea
        className="field min-h-[72px] resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </FieldWrap>
  )
}

/** Campo numérico com − / + , como no mockup. */
function Stepper({
  value,
  onChange,
  step,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  step: number
  suffix: string
}) {
  const bump = (delta: number) => {
    const current = Number(String(value).replace(',', '.')) || 0
    onChange(String(Math.max(0, current + delta)))
  }
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          className="field pr-10"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-faint">
          {suffix}
        </span>
      </div>
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => bump(-step)}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl font-bold text-ink-soft transition active:scale-95"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => bump(step)}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl font-bold text-ink-soft transition active:scale-95"
      >
        +
      </button>
    </div>
  )
}

/* ── Conversão formulário ⇄ banco ────────────────────────────────── */

function initialValues(kind: EventKind, event?: TimelineEvent): Record<string, string> {
  const nowLocal = toLocalInput(new Date())
  if (!event) {
    switch (kind) {
      case 'feeding':
        return { method: 'mamadeira', breast_side: '', amount_ml: '', occurred_at: nowLocal, notes: '' }
      case 'diaper':
        return { type: '', occurred_at: nowLocal, notes: '' }
      case 'medication':
        return { medication_name: '', dose: '', occurred_at: nowLocal, notes: '' }
      case 'sleep':
        return { started_at: nowLocal, ended_at: '', notes: '' }
      case 'growth':
        return { weight_kg: '', height_cm: '', measured_at: nowLocal, notes: '' }
      case 'note':
        return { note: '', occurred_at: nowLocal }
    }
  }

  switch (kind) {
    case 'feeding': {
      const r = event.row as Feeding
      return {
        method: r.method ?? '',
        breast_side: r.breast_side ?? '',
        amount_ml: r.amount_ml != null ? String(r.amount_ml) : '',
        occurred_at: toLocalInput(r.occurred_at),
        notes: r.notes ?? '',
      }
    }
    case 'diaper': {
      const r = event.row as DiaperEvent
      return { type: r.type ?? '', occurred_at: toLocalInput(r.occurred_at), notes: r.notes ?? '' }
    }
    case 'medication': {
      const r = event.row as Medication
      return {
        medication_name: r.medication_name ?? '',
        dose: r.dose ?? '',
        occurred_at: toLocalInput(r.occurred_at),
        notes: r.notes ?? '',
      }
    }
    case 'sleep': {
      const r = event.row as SleepEvent
      return {
        started_at: toLocalInput(r.started_at),
        ended_at: r.ended_at ? toLocalInput(r.ended_at) : '',
        notes: r.notes ?? '',
      }
    }
    case 'growth': {
      const r = event.row as GrowthMeasurement
      return {
        weight_kg: r.weight_kg != null ? String(r.weight_kg) : '',
        height_cm: r.height_cm != null ? String(r.height_cm) : '',
        measured_at: toLocalInput(r.measured_at),
        notes: r.notes ?? '',
      }
    }
    case 'note': {
      const r = event.row as HealthNote
      return { note: r.note, occurred_at: toLocalInput(r.occurred_at) }
    }
  }
}

/** Aceita "4,250" e "4.250". */
export function parseDecimal(raw: string): number | null {
  const clean = raw.trim().replace(',', '.')
  if (clean === '') return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : NaN
}

function validate(kind: EventKind, v: Record<string, string>, babyId: number | null): Errors {
  const e: Errors = {}
  if (babyId == null) e.babyId = 'Escolha o bebê.'

  const requireTime = (key: string) => {
    if (!v[key]) e[key] = 'Informe a data e o horário.'
  }

  switch (kind) {
    case 'feeding': {
      if (!v.method) e.method = 'Escolha o método.'
      requireTime('occurred_at')
      if (v.method === 'seio' && !v.breast_side) e.breast_side = 'Escolha qual seio.'
      const amount = parseDecimal(v.amount_ml ?? '')
      if (v.method === 'mamadeira' && amount == null) e.amount_ml = 'Informe a quantidade em ml.'
      else if (amount != null && (Number.isNaN(amount) || amount <= 0)) e.amount_ml = 'Use um número maior que zero.'
      break
    }
    case 'diaper':
      if (!v.type) e.type = 'Escolha o tipo.'
      requireTime('occurred_at')
      break
    case 'medication':
      if (!v.medication_name?.trim()) e.medication_name = 'Informe o medicamento.'
      requireTime('occurred_at')
      break
    case 'sleep': {
      requireTime('started_at')
      if (v.ended_at && v.started_at && v.ended_at <= v.started_at)
        e.ended_at = 'O fim precisa ser depois do início.'
      break
    }
    case 'growth': {
      requireTime('measured_at')
      const w = parseDecimal(v.weight_kg ?? '')
      const h = parseDecimal(v.height_cm ?? '')
      if (w != null && (Number.isNaN(w) || w <= 0)) e.weight_kg = 'Use um número maior que zero.'
      if (h != null && (Number.isNaN(h) || h <= 0)) e.height_cm = 'Use um número maior que zero.'
      if (w == null && h == null) e.measures = 'Informe pelo menos o peso ou a altura.'
      break
    }
    case 'note':
      if (!v.note?.trim()) e.note = 'Escreva a anotação.'
      requireTime('occurred_at')
      break
  }
  return e
}

/** Monta a linha do banco: horários convertidos de Brasília para UTC. */
function toRow(kind: EventKind, v: Record<string, string>, babyId: number): Record<string, unknown> {
  const text = (s?: string) => {
    const t = s?.trim()
    return t ? t : null
  }

  switch (kind) {
    case 'feeding':
      return {
        baby_id: babyId,
        occurred_at: inputToUtcISO(v.occurred_at),
        method: v.method,
        // Só faz sentido no seio: trocar para mamadeira limpa o lado.
        breast_side: v.method === 'seio' ? text(v.breast_side) : null,
        amount_ml: parseDecimal(v.amount_ml ?? ''),
        notes: text(v.notes),
      }
    case 'diaper':
      return {
        baby_id: babyId,
        occurred_at: inputToUtcISO(v.occurred_at),
        type: v.type,
        notes: text(v.notes),
      }
    case 'medication':
      return {
        baby_id: babyId,
        occurred_at: inputToUtcISO(v.occurred_at),
        medication_name: text(v.medication_name),
        dose: text(v.dose),
        notes: text(v.notes),
      }
    case 'sleep':
      return {
        baby_id: babyId,
        started_at: inputToUtcISO(v.started_at),
        ended_at: v.ended_at ? inputToUtcISO(v.ended_at) : null,
        notes: text(v.notes),
      }
    case 'growth':
      return {
        baby_id: babyId,
        measured_at: inputToUtcISO(v.measured_at),
        weight_kg: parseDecimal(v.weight_kg ?? ''),
        height_cm: parseDecimal(v.height_cm ?? ''),
        notes: text(v.notes),
      }
    case 'note':
      return {
        baby_id: babyId,
        occurred_at: inputToUtcISO(v.occurred_at),
        note: v.note.trim(),
      }
  }
}

/** Usado pela Home para encerrar um sono em aberto sem abrir o formulário. */
export async function endSleep(sleepId: number): Promise<void> {
  await saveEvent('sleep', { ended_at: new Date().toISOString() }, sleepId)
}
