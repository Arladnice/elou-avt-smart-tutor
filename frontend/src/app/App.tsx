import { lazy, Suspense } from 'react';
import { useSession } from '@/entities/session';
import { LazyFallback } from '@/shared/ui';
import { LoginPage } from '@/pages/login';
import { AppProviders } from './providers';

/**
 * Рабочие места грузятся отдельными чанками: оператору не нужен код панели
 * инструктора (таблицы, конструктор сценариев), инструктору — мнемосхема
 * и графики на recharts. На экране входа не загружается ни то, ни другое.
 */
const OperatorPage = lazy(() => import('@/pages/operator').then(m => ({ default: m.OperatorPage })));
const InstructorPage = lazy(() => import('@/pages/instructor').then(m => ({ default: m.InstructorPage })));

/** Маршрутизация по факту авторизации и роли пользователя */
const RootRouter: React.FC = () => {
  const { username, role } = useSession();

  if (!username) return <LoginPage />;

  return (
    <Suspense fallback={<LazyFallback label="Загрузка рабочего места" />}>
      {role === 'instructor' ? <InstructorPage /> : <OperatorPage />}
    </Suspense>
  );
};

const App: React.FC = () => (
  <AppProviders>
    <RootRouter />
  </AppProviders>
);

export default App;
