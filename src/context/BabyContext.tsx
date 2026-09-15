import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { errorMessage, supabase } from '../lib/supabase'
import type { Baby } from '../lib/types'

const KEY = 'nb:baby'

/** `null` = "Ambos" (usado nos relatórios). */
export type Selection = number | null

type BabyCtx = {
  babies: Baby[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  selected: Selection
  select: (id: Selection) => void
  /** Bebê selecionado; quando "Ambos", cai no primeiro da lista. */
  current: Baby | undefined
  byId: (id: number | null) => Baby | undefined
}

const Ctx = createContext<BabyCtx | null>(null)

/** Se o usuário já escolheu um bebê alguma vez (pula a tela de seleção). */
export function hasSavedSelection(): boolean {
  try {
    return localStorage.getItem(KEY) != null
  } catch {
    return false
  }
}

function savedSelection(): Selection {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'both') return null
    if (raw) return Number(raw)
  } catch {
    /* ignora */
  }
  return null
}

export function BabyProvider({ children }: { children: ReactNode }) {
  const [babies, setBabies] = useState<Baby[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Selection>(savedSelection)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const { data, error: err } = await supabase.from('gemeos_babies').select('*').order('id')
      if (err) throw err
      setBabies((data ?? []) as Baby[])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // A foto de perfil pode mudar em outro dispositivo.
    const channel = supabase
      .channel('babies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gemeos_babies' }, () => {
        void reload()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [reload])

  const select = useCallback((id: Selection) => {
    setSelected(id)
    try {
      localStorage.setItem(KEY, id == null ? 'both' : String(id))
    } catch {
      /* ignora */
    }
  }, [])

  const value = useMemo<BabyCtx>(
    () => ({
      babies,
      loading,
      error,
      reload,
      selected,
      select,
      current: babies.find((b) => b.id === selected) ?? babies[0],
      byId: (id) => babies.find((b) => b.id === id),
    }),
    [babies, loading, error, reload, selected, select],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBabies() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBabies precisa estar dentro de <BabyProvider>')
  return ctx
}

/** Cor de identidade: azul para o Leo, rosa para a Clara. */
export function babyAccent(baby: Baby | undefined) {
  const isClara = baby?.nickname?.toLowerCase().startsWith('clara')
  return isClara
    ? {
        key: 'clara' as const,
        hex: '#ec4899',
        text: 'text-clara dark:text-pink-300',
        bg: 'bg-clara',
        soft: 'bg-clara-soft dark:bg-pink-500/15',
        ring: 'ring-clara',
        border: 'border-clara',
        btn: 'bg-clara text-white',
      }
    : {
        key: 'leo' as const,
        hex: '#3b82f6',
        text: 'text-leo dark:text-sky-300',
        bg: 'bg-leo',
        soft: 'bg-leo-soft dark:bg-sky-500/15',
        ring: 'ring-leo',
        border: 'border-leo',
        btn: 'bg-leo text-white',
      }
}

/** Primeiro nome curto para exibir ("Léo", "Clara"). */
export const babyLabel = (b: Baby | undefined) =>
  !b ? '' : b.nickname.toLowerCase() === 'leo' ? 'Léo' : capitalize(b.nickname)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
