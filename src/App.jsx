import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/login/LoginPage';
import { AuthProvider, useAuth } from './lib/AuthContext';
import logo from './assets/ccs-logo.png';
import ComingSoon from './pages/ComingSoon';
import PricesPage from './pages/prices/PricesPage';
import CallFlowPage from './pages/callflow/CallFlowPage';
import FavoritesPage from './pages/favorites/FavoritesPage';
import DailySummaryPage from './pages/summary/DailySummaryPage';
import TotalsPage from './pages/summary/TotalsPage';
import RemindersPage from './pages/reminders/RemindersPage';
import ProtocolPage from './pages/protocol/ProtocolPage';
import ProtocolAlerts from './components/ProtocolAlerts';
import ReminderAlerts from './components/ReminderAlerts';
import Topbar from './components/Topbar';
import AssistantPage from './pages/assistant/AssistantPage';
import QualityPage from './pages/qc/QualityPage';
import RemarketingPage from './pages/remarketing/RemarketingPage';
import AdminPage from './pages/admin/AdminPage';
import GamesPage from './pages/games/GamesPage';
import StatsPage from './pages/stats/StatsPage';
import { ALL_SECTIONS } from './sections';
import './App.css';

const PAGES = {
  '/precios': PricesPage,
  '/flujo-de-llamada': CallFlowPage,
  '/favoritos': FavoritesPage,
  '/resumen-del-dia': DailySummaryPage,
  '/resumenes': TotalsPage,
  '/recordatorios': RemindersPage,
  '/protocolo': ProtocolPage,
  '/asistente': AssistantPage,
  '/control-de-calidad': QualityPage,
  '/remarketing': RemarketingPage,
  '/admin': AdminPage,
  '/juegos': GamesPage,
  '/estadisticas': StatsPage,
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="route-stage" key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/precios" replace />} />
        {ALL_SECTIONS.map((section) => {
          const Page = PAGES[section.path];
          return <Route key={section.path} path={section.path} element={Page ? <Page /> : <ComingSoon title={section.label} />} />;
        })}
        <Route path="*" element={<Navigate to="/precios" replace />} />
      </Routes>
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="splash">
        <img src={logo} alt="CC+CS Solutions" className="splash__logo" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <ProtocolAlerts />
      <ReminderAlerts />
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

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
