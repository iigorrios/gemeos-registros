import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { EVENT_TABLES } from '../lib/eventKinds'

export type RealtimeStatus = 'connecting' | 'live' | 'off'

/**
 * Observa todas as tabelas de eventos e chama `onChange` quando algo muda —
 * inclusive registros gravados pelo n8n a partir do WhatsApp.
 *
 * O volume de dados aqui é pequeno, então recarregar a consulta inteira é mais
 * confiável (e mais simples) do que remendar o estado local linha a linha.
 */
export function useRealtime(onChange: () => void): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const handler = useRef(onChange)
  handler.current = onChange

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    // Agrupa rajadas (o n8n pode gravar vários registros seguidos).
    const debounced = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => handler.current(), 250)
    }

    let channel = supabase.channel('gemeos-events')
    for (const table of EVENT_TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, debounced)
    }

    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') setStatus('live')
      else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') setStatus('off')
    })

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [])

  return status
}
