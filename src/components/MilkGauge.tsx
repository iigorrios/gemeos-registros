import { formatNumber } from '../lib/events'
import { fmtDate } from '../lib/time'
import type { GrowthMeasurement, TimelineEvent } from '../lib/types'
import { AlertIcon, BottleIcon, RulerIcon } from './icons'

/**
 * Referência de consumo diário de leite por quilo de peso.
 * É um valor de orientação, não um teto rígido — quem ajusta é a pediatra.
 */
export const ML_POR_KG_DIA = 165

type Faixa = {
  chave: 'normal' | 'atencao' | 'quase' | 'acima'
  rotulo: string
  barra: string
  texto: string
  fundo: string
}

/** Quanto mais perto do limite, mais quente a cor. */
function faixaDe(percentual: number): Faixa {
  if (percentual > 100)
    return {
      chave: 'acima',
      rotulo: 'acima do sugerido',
      barra: 'bg-rose-500',
      texto: 'text-rose-600 dark:text-rose-300',
      fundo: 'bg-rose-100 dark:bg-rose-500/15',
    }
  if (percentual >= 90)
    return {
      chave: 'quase',
      rotulo: 'quase no limite',
      barra: 'bg-orange-500',
      texto: 'text-orange-600 dark:text-orange-300',
      fundo: 'bg-orange-100 dark:bg-orange-500/15',
    }
  if (percentual >= 70)
    return {
      chave: 'atencao',
      rotulo: 'chegando perto',
      barra: 'bg-amber-400',
      texto: 'text-amber-600 dark:text-amber-300',
      fundo: 'bg-amber-100 dark:bg-amber-400/15',
    }
  return {
    chave: 'normal',
    rotulo: 'dentro do esperado',
    barra: 'bg-sky-500',
    texto: 'text-sky-600 dark:text-sky-300',
    fundo: 'bg-sky-100 dark:bg-sky-400/15',
  }
}

export function MilkGauge({
  totalMl,
  totalBreastMin,
  ultimaMedida,
  onRegistrarPeso,
}: {
  totalMl: number
  totalBreastMin: number
  ultimaMedida: TimelineEvent | undefined
  onRegistrarPeso: () => void
}) {
  const peso = ultimaMedida ? Number((ultimaMedida.row as GrowthMeasurement).weight_kg ?? 0) : 0

  // Sem peso não há como calcular o limite: melhor pedir a medida do que
  // mostrar uma porcentagem inventada.
  if (!peso) {
    return (
      <button
        onClick={onRegistrarPeso}
        className="card flex w-full items-center gap-3 p-4 text-left transition active:scale-[.99]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300">
          <RulerIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Registre o peso</p>
          <p className="text-sm text-ink-soft">
            Com o peso dá para acompanhar quanto leite falta para o limite do dia.
          </p>
        </div>
      </button>
    )
  }

  const limite = Math.round(ML_POR_KG_DIA * peso)
  const percentual = (totalMl / limite) * 100
  const faixa = faixaDe(percentual)
  const alerta = faixa.chave !== 'normal'

  return (
    <section className={`card p-4 ${alerta ? faixa.fundo : ''}`}>
      <header className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface ${faixa.texto}`}>
          {alerta ? <AlertIcon /> : <BottleIcon />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">Leite hoje</p>
          <p className={`text-sm font-bold ${alerta ? faixa.texto : 'text-ink-soft'}`}>{faixa.rotulo}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-extrabold leading-none ${faixa.texto}`}>
            {Math.round(percentual)}%
          </p>
          <p className="mt-0.5 text-xs font-bold text-ink-faint">
            {formatNumber(totalMl)} / {formatNumber(limite)} ml
          </p>
        </div>
      </header>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(percentual)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Leite consumido hoje em relação ao limite sugerido"
      >
        <div
          className={`h-full rounded-full transition-all ${faixa.barra}`}
          style={{ width: `${Math.min(100, Math.max(percentual, percentual > 0 ? 3 : 0))}%` }}
        />
      </div>

      <p className="mt-2.5 text-xs text-ink-faint">
        limite sugerido {ML_POR_KG_DIA} ml/kg/dia · peso {formatNumber(peso)} kg, medido em{' '}
        {fmtDate(ultimaMedida!.at)}
      </p>

      {/* A conta só enxerga mamadeira: mamada no seio não tem volume medido. */}
      {totalBreastMin > 0 && (
        <p className="mt-1 text-xs text-ink-faint">
          Só a mamadeira entra nesta conta — o seio não tem volume medido.
        </p>
      )}
    </section>
  )
}
