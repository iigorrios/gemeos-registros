import { NavLink, Outlet } from 'react-router-dom'
import { useForms } from '../context/FormContext'
import { useOnline } from '../hooks/useOnline'
import { ChartIcon, HistoryIcon, HomeIcon, MoreIcon, PlusIcon } from './icons'

const NAV = [
  { to: '/hoje', label: 'Início', Icon: HomeIcon },
  { to: '/historico', label: 'Histórico', Icon: HistoryIcon },
  { to: '/relatorios', label: 'Relatórios', Icon: ChartIcon },
  { to: '/mais', label: 'Mais', Icon: MoreIcon },
]

export function AppLayout() {
  const online = useOnline()

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col">
      {!online && (
        <div className="safe-top sticky top-0 z-40 bg-amber-400 px-4 py-2 text-center text-sm font-bold text-amber-950">
          Sem internet — mostrando os últimos dados carregados.
        </div>
      )}

      <main className="flex-1 px-4 pb-32 pt-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const { quickAdd } = useForms()

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto w-full max-w-2xl px-4 pb-3">
        <div className="relative flex items-center justify-between rounded-3xl border border-line/70 bg-surface/95 px-2 py-2 shadow-lift backdrop-blur">
          {NAV.slice(0, 2).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          <button
            onClick={quickAdd}
            aria-label="Novo registro"
            className="grid h-14 w-14 shrink-0 -translate-y-5 place-items-center rounded-full bg-sky-500 text-white shadow-lift transition active:scale-95"
          >
            <PlusIcon width={26} height={26} />
          </button>

          {NAV.slice(2).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    </nav>
  )
}

function NavItem({ to, label, Icon }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-bold transition ${
          isActive ? 'text-sky-500' : 'text-ink-faint'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon width={22} height={22} strokeWidth={isActive ? 2.2 : 1.8} />
          {label}
        </>
      )}
    </NavLink>
  )
}
