import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. ' +
      'Copie .env.example para .env.local (local) ou cadastre-as em Environment Variables na Vercel.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 5 } },
})

export const FOTOS_BUCKET = 'gemeos-fotos'

/** Mensagem de erro legível para o usuário final. */
export function errorMessage(err: unknown): string {
  if (!navigator.onLine) return 'Você está sem internet. Conecte-se e tente de novo.'
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message)
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Não foi possível falar com o servidor. Tente de novo.'
    return msg
  }
  return 'Algo deu errado. Tente de novo.'
}
