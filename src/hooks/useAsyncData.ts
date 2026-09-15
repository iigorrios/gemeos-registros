import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/supabase'
import { useRealtime, type RealtimeStatus } from './useRealtime'

type Result<T> = {
  data: T | undefined
  loading: boolean
  error: string | null
  /** Recarrega mostrando o spinner. */
  reload: () => void
  /** Recarrega em silêncio (usado pelo Realtime). */
  refresh: () => void
  realtime: RealtimeStatus
}

/**
 * Executa um loader assíncrono, com estados de loading/erro, e o repete sempre
 * que o Realtime avisar que alguma tabela de evento mudou.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[]): Result<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader
  // Evita aplicar o resultado de uma busca antiga que terminou depois.
  const runId = useRef(0)

  const run = useCallback(async (quiet: boolean) => {
    const id = ++runId.current
    if (!quiet) setLoading(true)
    try {
      const result = await loaderRef.current()
      if (id !== runId.current) return
      setData(result)
      setError(null)
    } catch (err) {
      if (id !== runId.current) return
      setError(errorMessage(err))
    } finally {
      if (id === runId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, run])

  const refresh = useCallback(() => void run(true), [run])
  const realtime = useRealtime(refresh)

  return {
    data,
    loading,
    error,
    reload: () => setTick((t) => t + 1),
    refresh,
    realtime,
  }
}
