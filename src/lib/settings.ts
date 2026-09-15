import { supabase } from './supabase'

/**
 * Configurações que o app edita e o n8n lê. Hoje só o prompt do extrator de
 * IA — o fluxo do WhatsApp busca essa chave a cada mensagem, então salvar aqui
 * já vale para a próxima mensagem do grupo, sem mexer no n8n.
 */
export const AI_PROMPT_KEY = 'ai_prompt'

export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('gemeos_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  return (data as { value: string } | null)?.value ?? null
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('gemeos_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}
