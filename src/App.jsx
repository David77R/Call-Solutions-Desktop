import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/login/LoginPage';
import { AuthProvider, useAuth } from './lib/AuthContext';
import logo from './assets/ccs-logo.png';
import ComingSoon from './pages/ComingSoon';
import PricesPage from './pages/prices/PricesPage';
import CallFlowPage from './pages/callflow/CallFlowPage';
import FavoritesPage from './pages/favorites/FavoritesPage';
import { ALL_SECTIONS } from './sections';
import './App.css';

const PAGES = {
  '/precios': PricesPage,
  '/flujo-de-llamada': CallFlowPage,
  '/favoritos': FavoritesPage,
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
      <div className="shell">
        <Sidebar />
        <main className="shell__main">
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
