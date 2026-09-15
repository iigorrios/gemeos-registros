import { useRef, useState } from 'react'
import { BabyAvatar } from '../components/BabyAvatar'
import {
  CameraIcon,
  HeartIcon,
  InfoIcon,
  LockIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
  WhatsappIcon,
} from '../components/icons'
import { ErrorState, FieldWrap, LoadingBlock, Sheet, Spinner } from '../components/ui'
import { babyAccent, babyLabel, useBabies } from '../context/BabyContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useOnline } from '../hooks/useOnline'
import { errorMessage, FOTOS_BUCKET, supabase } from '../lib/supabase'
import { babyAge, fmtBirthDate, todayInput } from '../lib/time'
import type { Baby } from '../lib/types'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export function Mais() {
  const { babies, loading, error, reload } = useBabies()
  const { theme, toggle } = useTheme()
  const [editing, setEditing] = useState<Baby | null>(null)

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-3xl font-extrabold tracking-tight">Mais</h1>

      <section>
        <h2 className="mb-2.5 px-1 font-extrabold">Perfil dos bebês</h2>

        {loading && <LoadingBlock rows={2} />}
        {error && !loading && <ErrorState message={error} onRetry={() => void reload()} />}

        <div className="card divide-y divide-line/70 overflow-hidden">
          {babies.map((baby) => (
            <button
              key={baby.id}
              onClick={() => setEditing(baby)}
              className="flex w-full items-center gap-3 p-4 text-left transition active:scale-[.99]"
            >
              <BabyAvatar baby={baby} size={48} />
              <div className="min-w-0 flex-1">
                <p className={`font-extrabold ${babyAccent(baby).text}`}>{babyLabel(baby)}</p>
                <p className="truncate text-sm text-ink-soft">{baby.name}</p>
                {babyAge(baby.birth_date) && (
                  <p className="truncate text-sm font-bold text-ink-faint">
                    {babyAge(baby.birth_date)} · nasceu {fmtBirthDate(baby.birth_date)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-bold text-ink-faint">Editar</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 px-1 font-extrabold">Preferências</h2>
        <div className="card divide-y divide-line/70 overflow-hidden">
          <button onClick={toggle} className="flex w-full items-center gap-3 p-4 text-left transition active:scale-[.99]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-soft">
              {theme === 'dark' ? <MoonIcon width={20} height={20} /> : <SunIcon width={20} height={20} />}
            </span>
            <span className="flex-1 font-bold">Tema</span>
            <span className="text-sm font-bold text-ink-faint">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
          </button>

          <div className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
              <WhatsappIcon width={20} height={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Registros do WhatsApp</p>
              <p className="text-sm text-ink-soft">
                As mensagens do grupo continuam entrando sozinhas e aparecem aqui na hora.
              </p>
            </div>
          </div>

          {/* Rota do middleware: apaga o cookie e volta para a tela de senha. */}
          <a href="/__sair" className="flex w-full items-center gap-3 p-4 text-left transition active:scale-[.99]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-soft">
              <LockIcon width={20} height={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Sair</p>
              <p className="text-sm text-ink-soft">Pede a senha de novo neste aparelho.</p>
            </div>
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 px-1 font-extrabold">Sobre</h2>
        <div className="card space-y-3 p-5 text-sm text-ink-soft">
          <p className="flex items-center gap-2 font-extrabold text-ink">
            <HeartIcon width={16} height={16} className="text-pink-400" />
            Nossos Bebês
          </p>
          <p>Rotina, cuidado e tudo no lugar — Léo e Clara.</p>
          <p className="flex items-center gap-2">
            <InfoIcon width={15} height={15} />
            Versão {__APP_VERSION__} · horários em Brasília (America/Sao_Paulo)
          </p>
        </div>
      </section>

      <BabyProfileSheet baby={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function BabyProfileSheet({ baby, onClose }: { baby: Baby | null; onClose: () => void }) {
  const { reload } = useBabies()
  const toast = useToast()
  const online = useOnline()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [ready, setReady] = useState<number | null>(null)

  // Carrega os campos ao abrir um bebê diferente.
  if (baby && ready !== baby.id) {
    setReady(baby.id)
    setName(baby.name)
    setNickname(baby.nickname)
    setBirthDate(baby.birth_date ?? '')
    setPhotoUrl(baby.photo_url)
  }

  const close = () => {
    setReady(null)
    setNameError('')
    onClose()
  }

  const handleFile = async (file: File) => {
    if (!baby) return
    if (!file.type.startsWith('image/')) {
      toast('Escolha um arquivo de imagem.', 'error')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast('A imagem precisa ter menos de 5 MB.', 'error')
      return
    }
    if (!online) {
      toast('Sem internet — não deu para enviar a foto.', 'error')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${baby.nickname}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(FOTOS_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw upErr

      const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
      toast('Foto carregada. Toque em Salvar para confirmar.')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!baby) return
    if (!name.trim()) {
      setNameError('Informe o nome.')
      return
    }
    if (!nickname.trim()) {
      setNameError('Informe o apelido.')
      return
    }
    if (birthDate && birthDate > todayInput()) {
      setNameError('A data de nascimento não pode ser no futuro.')
      return
    }
    if (!online) {
      toast('Sem internet — nada foi salvo.', 'error')
      return
    }

    setSaving(true)
    try {
      const { error: err } = await supabase
        .from('gemeos_babies')
        .update({
          name: name.trim(),
          nickname: nickname.trim().toLowerCase(),
          birth_date: birthDate || null,
          photo_url: photoUrl,
        })
        .eq('id', baby.id)
      if (err) {
        // nickname tem índice único no banco.
        if (err.code === '23505') {
          setNameError('Esse apelido já está em uso pelo outro bebê.')
          return
        }
        throw err
      }
      await reload()
      toast('Perfil atualizado.')
      close()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!baby) return null
  const accent = babyAccent(baby)

  return (
    <Sheet
      open
      onClose={close}
      title={`Perfil de ${babyLabel(baby)}`}
      footer={
        <button className={`btn w-full ${accent.btn}`} onClick={() => void handleSave()} disabled={saving || uploading}>
          {saving ? <Spinner /> : 'Salvar'}
        </button>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="flex flex-col items-center gap-3 py-2">
          <BabyAvatar baby={{ ...baby, photo_url: photoUrl }} size={104} ring />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn bg-surface-2 px-3.5 py-2.5 text-sm text-ink"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Spinner className="h-4 w-4" /> : <CameraIcon width={16} height={16} />}
              {photoUrl ? 'Trocar foto' : 'Enviar foto'}
            </button>
            {photoUrl && (
              <button
                type="button"
                className="btn bg-surface-2 px-3.5 py-2.5 text-sm text-rose-500"
                onClick={() => setPhotoUrl(null)}
                disabled={uploading}
              >
                Remover
              </button>
            )}
          </div>
        </div>

        <FieldWrap label="Nome" error={nameError}>
          <input
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError('')
            }}
            placeholder="Ex: Heitor Leonardo"
          />
        </FieldWrap>

        <FieldWrap label="Apelido" hint="Usado pelo robô do WhatsApp para identificar o bebê.">
          <input
            className="field"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setNameError('')
            }}
            placeholder="Ex: leo"
          />
        </FieldWrap>

        <FieldWrap
          label="Data de nascimento"
          hint={babyAge(birthDate) ? `Hoje: ${babyAge(birthDate)}` : 'Usada para mostrar o tempo de vida.'}
        >
          <input
            type="date"
            className="field"
            value={birthDate}
            max={todayInput()}
            onChange={(e) => {
              setBirthDate(e.target.value)
              setNameError('')
            }}
          />
        </FieldWrap>

        <p className="flex items-start gap-2 rounded-2xl bg-surface-2/70 px-3.5 py-3 text-sm text-ink-soft">
          <UserIcon width={16} height={16} className="mt-0.5 shrink-0" />
          Mudar o apelido afeta como o fluxo do n8n reconhece o bebê nas mensagens do WhatsApp.
        </p>
      </div>
    </Sheet>
  )
}
