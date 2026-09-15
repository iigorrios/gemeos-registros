import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { EventForm } from '../components/EventForm'
import { EventIcon } from '../components/EventIcon'
import { Sheet } from '../components/ui'
import { ALL_KINDS, KINDS } from '../lib/eventKinds'
import type { EventKind, TimelineEvent } from '../lib/types'

type FormState = { kind: EventKind; event?: TimelineEvent } | null

const Ctx = createContext<{
  create: (kind: EventKind) => void
  edit: (event: TimelineEvent) => void
  quickAdd: () => void
} | null>(null)

/**
 * Os formulários vivem acima das telas: qualquer lugar do app pode abrir
 * "registrar" ou "editar" sem trocar de rota.
 */
export function FormProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<FormState>(null)
  const [picker, setPicker] = useState(false)

  const value = useMemo(
    () => ({
      create: (kind: EventKind) => {
        setPicker(false)
        setForm({ kind })
      },
      edit: (event: TimelineEvent) => {
        setPicker(false)
        setForm({ kind: event.kind, event })
      },
      quickAdd: () => setPicker(true),
    }),
    [],
  )

  const close = useCallback(() => setForm(null), [])

  return (
    <Ctx.Provider value={value}>
      {children}

      <Sheet open={picker} onClose={() => setPicker(false)} title="O que você quer registrar?">
        <div className="grid grid-cols-2 gap-3 pb-6 pt-1">
          {ALL_KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => value.create(kind)}
              className="flex flex-col items-start gap-2.5 rounded-3xl border border-line bg-surface-2/50 p-4 text-left transition active:scale-[.97]"
            >
              <EventIcon kind={kind} />
              <span className="font-extrabold">{KINDS[kind].label}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {form && <EventForm open kind={form.kind} event={form.event} onClose={close} />}
    </Ctx.Provider>
  )
}

export function useForms() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useForms precisa estar dentro de <FormProvider>')
  return ctx
}
