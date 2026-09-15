import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BabyFace, HeartIcon } from '../components/icons'
import { hasSavedSelection } from '../context/BabyContext'

export function Splash() {
  const navigate = useNavigate()
  const next = hasSavedSelection() ? '/hoje' : '/selecionar'

  useEffect(() => {
    const id = setTimeout(() => navigate(next, { replace: true }), 2000)
    return () => clearTimeout(id)
  }, [navigate, next])

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-8 text-center">
      <div className="animate-fade-in flex flex-col items-center">
        <HeartIcon className="mb-6 text-pink-300" width={26} height={26} />

        <div className="flex -space-x-4">
          <BabyFace variant="leo" size={96} />
          <BabyFace variant="clara" size={96} />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Nossos Bebês</h1>
        <p className="mt-2 text-ink-soft">Rotina, cuidado e tudo no lugar</p>

        <HeartIcon className="mt-6 text-pink-300" width={20} height={20} />
      </div>

      <button
        onClick={() => navigate(next, { replace: true })}
        className="btn mt-12 w-full max-w-xs bg-sky-500 text-white shadow-card"
      >
        Começar
      </button>
    </div>
  )
}
