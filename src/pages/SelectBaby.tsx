import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BabyAvatar } from '../components/BabyAvatar'
import { ErrorState, LoadingBlock } from '../components/ui'
import { babyAccent, babyLabel, useBabies, type Selection } from '../context/BabyContext'

export function SelectBaby() {
  const { babies, loading, error, reload, selected, select } = useBabies()
  const [choice, setChoice] = useState<Selection>(selected)
  const navigate = useNavigate()

  const confirm = () => {
    select(choice ?? babies[0]?.id ?? null)
    navigate('/hoje', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-extrabold">Selecionar bebês</h1>
      <p className="mt-1 text-ink-soft">Quem você quer acompanhar?</p>

      <div className="mt-8 space-y-4">
        {loading && <LoadingBlock rows={2} />}
        {error && !loading && <ErrorState message={error} onRetry={() => void reload()} />}

        {!loading &&
          !error &&
          babies.map((baby) => {
            const accent = babyAccent(baby)
            const active = choice === baby.id
            return (
              <button
                key={baby.id}
                onClick={() => setChoice(baby.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left transition active:scale-[.98] ${
                  active
                    ? `${accent.border} ${accent.soft} shadow-card`
                    : 'border-transparent bg-surface-2/60'
                }`}
              >
                <BabyAvatar baby={baby} size={64} />
                <span>
                  <span className={`block text-xl font-extrabold ${active ? accent.text : 'text-ink'}`}>
                    {babyLabel(baby)}
                  </span>
                  <span className="text-sm text-ink-soft">{baby.name}</span>
                </span>
              </button>
            )
          })}
      </div>

      <button
        onClick={confirm}
        disabled={loading || babies.length === 0}
        className="btn mt-10 bg-sky-500 text-white shadow-card"
      >
        Continuar
      </button>
    </div>
  )
}
