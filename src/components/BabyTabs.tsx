import { babyAccent, babyLabel, useBabies, type Selection } from '../context/BabyContext'
import { BabyAvatar } from './BabyAvatar'

/**
 * Abas "Léo" / "Clara" (e "Ambos" onde faz sentido). A escolha é global e
 * fica salva no localStorage.
 */
export function BabyTabs({ allowBoth = false }: { allowBoth?: boolean }) {
  const { babies, selected, select } = useBabies()
  if (babies.length === 0) return null

  const tabs: { key: Selection; label: string }[] = [
    ...babies.map((b) => ({ key: b.id as Selection, label: babyLabel(b) })),
    ...(allowBoth ? [{ key: null as Selection, label: 'Ambos' }] : []),
  ]

  // Telas sem "Ambos" caem no primeiro bebê — a aba tem que refletir isso.
  const active = allowBoth ? selected : (selected ?? babies[0]?.id ?? null)

  return (
    <div className="flex gap-2" role="tablist" aria-label="Selecionar bebê">
      {tabs.map((tab) => {
        const baby = babies.find((b) => b.id === tab.key)
        const accent = babyAccent(baby)
        const isActive = active === tab.key
        const isBoth = tab.key === null

        return (
          <button
            key={String(tab.key)}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-extrabold transition active:scale-[.97] ${
              isActive
                ? isBoth
                  ? 'bg-ink text-canvas shadow-card'
                  : `${accent.btn} shadow-card`
                : 'bg-surface-2/70 text-ink-soft'
            }`}
          >
            {!isBoth && <BabyAvatar baby={baby} size={24} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Quando o usuário está em "Ambos" mas a tela exige um bebê específico,
 * devolve o primeiro da lista.
 */
export function useSelectedBaby() {
  const { babies, selected } = useBabies()
  return babies.find((b) => b.id === selected) ?? babies[0]
}
