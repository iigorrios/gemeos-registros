import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { LoadingBlock } from './components/ui'
import { BabyProvider } from './context/BabyContext'
import { FormProvider } from './context/FormContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { Historico } from './pages/Historico'
import { Home } from './pages/Home'
import { Mais } from './pages/Mais'
import { SelectBaby } from './pages/SelectBaby'
import { Splash } from './pages/Splash'

// Os gráficos (Recharts) são pesados e só aparecem aqui — carregam sob demanda.
const Relatorios = lazy(() => import('./pages/Relatorios').then((m) => ({ default: m.Relatorios })))

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BabyProvider>
          <FormProvider>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/selecionar" element={<SelectBaby />} />
              <Route element={<AppLayout />}>
                <Route path="/hoje" element={<Home />} />
                <Route path="/historico" element={<Historico />} />
                <Route
                  path="/relatorios"
                  element={
                    <Suspense fallback={<LoadingBlock rows={4} />}>
                      <Relatorios />
                    </Suspense>
                  }
                />
                <Route path="/mais" element={<Mais />} />
              </Route>
              <Route path="*" element={<Navigate to="/hoje" replace />} />
            </Routes>
          </FormProvider>
        </BabyProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
