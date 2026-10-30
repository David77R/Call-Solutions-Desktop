import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './lib/AuthContext';
import logo from './assets/ccs-logo.webp';
import ComingSoon from './pages/ComingSoon';
import ProtocolAlerts from './components/ProtocolAlerts';
import ReminderAlerts from './components/ReminderAlerts';
import Topbar from './components/Topbar';
import MessagesDrawer from './components/MessagesDrawer';
import UpdateBanner from './components/UpdateBanner';
import CounterDrawer from './components/CounterDrawer';
import { ALL_SECTIONS } from './sections';
import './App.css';

const PREFETCH_DELAY_MS = 2500;

const LoginPage = lazy(() => import('./pages/login/LoginPage'));

const LOADERS = {
  '/precios': () => import('./pages/prices/PricesPage'),
  '/flujo-de-llamada': () => import('./pages/callflow/CallFlowPage'),
  '/favoritos': () => import('./pages/favorites/FavoritesPage'),
  '/resumen-del-dia': () => import('./pages/summary/DailySummaryPage'),
  '/resumenes': () => import('./pages/summary/TotalsPage'),
  '/recordatorios': () => import('./pages/reminders/RemindersPage'),
  '/protocolo': () => import('./pages/protocol/ProtocolPage'),
  '/asistente': () => import('./pages/assistant/AssistantPage'),
  '/razas': () => import('./pages/breeds/BreedsPage'),
  '/control-de-calidad': () => import('./pages/qc/QualityPage'),
  '/remarketing': () => import('./pages/remarketing/RemarketingPage'),
  '/admin': () => import('./pages/admin/AdminPage'),
  '/juegos': () => import('./pages/games/GamesPage'),
  '/estadisticas': () => import('./pages/stats/StatsPage'),
};

const PAGES = Object.fromEntries(Object.entries(LOADERS).map(([path, load]) => [path, lazy(load)]));

function usePrefetchPages() {
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const queue = Object.values(LOADERS);
    let handle = null;
    let delay = null;
    const next = () => {
      const load = queue.shift();
      if (!load) return;
      load()
        .catch(() => {})
        .finally(() => {
          handle = idle(next);
        });
    };
    delay = setTimeout(() => {
      handle = idle(next);
    }, PREFETCH_DELAY_MS);
    return () => {
      clearTimeout(delay);
      cancel(handle);
    };
  }, []);
}

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Cargando">
      <span />
      <span />
      <span />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="route-stage" key={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/precios" replace />} />
          {ALL_SECTIONS.map((section) => {
            const Page = PAGES[section.path];
            return <Route key={section.path} path={section.path} element={Page ? <Page /> : <ComingSoon title={section.label} />} />;
          })}
          <Route path="*" element={<Navigate to="/precios" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function Shell() {
  usePrefetchPages();
  return (
    <BrowserRouter>
      <ProtocolAlerts />
      <ReminderAlerts />
      <MessagesDrawer />
      <CounterDrawer />
      <UpdateBanner />
      <div className="shell">
        <Sidebar />
        <main className="shell__main">
          <Topbar />
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}

function Splash() {
  return (
    <div className="splash">
      <img src={logo} alt="CC+CS Solutions" className="splash__logo" />
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;

  if (!user) {
    return (
      <Suspense fallback={<Splash />}>
        <LoginPage />
      </Suspense>
    );
  }

  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
