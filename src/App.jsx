import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import AILogger from './pages/AILogger';
import Analytics from './pages/Analytics';
import SavingsGoals from './pages/SavingsGoals';
import BillCalendar from './pages/BillCalendar';
import AIChat from './pages/AIChat';
import DynamicSection from './pages/DynamicSection';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Investments from './pages/Investments';
import MonthlyReport from './pages/MonthlyReport';
import AllExpenses from './pages/AllExpenses';
import NewSectionToast from './components/NewSectionToast';
import { revokeToken } from './services/googleAuth';
import { readUserState } from './services/userStorage';

function Topbar() {
  const { state } = useApp();
  const location = useLocation();
  const activePath = location.pathname;

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/logger', label: 'AI Logger' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/investments', label: 'Investments' },
    { path: '/goals', label: 'Goals' },
    { path: '/bills', label: 'Bill Calendar' },
    { path: '/report', label: 'Monthly Report' },
    { path: '/chat', label: 'AI Chat' },
    { path: '/settings', label: 'Settings' },
  ];

  if (state.isAdmin) {
    links.push({ path: '/admin', label: 'Admin Panel' });
  }

  const dynamicSections = (state.appBlueprint || []).filter(s => s.Status === 'Active');

  return (
    <div style={{
      background: 'var(--bg-sidebar)',
      borderBottom: '1px solid var(--border-color)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '20px' }}>
        <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>F</span>
        </div>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 800, color: 'var(--primary-color)' }}>FINANCIAL OS</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {links.map(l => {
          const active = activePath === l.path;
          return (
            <Link
              key={l.path}
              to={l.path}
              style={{
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary-color)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '8px',
                background: active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: active ? '1px solid var(--border-color)' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {l.label}
            </Link>
          );
        })}
        {dynamicSections.map(s => {
          const path = `/section/${s.SectionID}`;
          const active = activePath === path;
          return (
            <Link
              key={s.SectionID}
              to={path}
              style={{
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary-color)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '8px',
                background: active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: active ? '1px solid var(--border-color)' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {s.Icon} {s.Name?.replace(/^[^\s]+\s/, '') || s.SectionID}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ThemeEffects() {
  const { state } = useApp();
  const theme = state.config?.theme;
  const decorations = theme?.decorations || 'none';

  if (decorations === 'scanlines') {
    return (
      <div className="crt-scanlines" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.12) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))',
        backgroundSize: '100% 4px, 6px 100%', opacity: 0.85
      }} />
    );
  }

  if (decorations === 'blueprint-grid') {
    return (
      <div className="blueprint-grid" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1,
        backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
        backgroundSize: '30px 30px', opacity: 0.12
      }} />
    );
  }

  if (decorations === 'chalkboard-dust') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[...Array(15)].map((_, i) => {
          const size = Math.random() * 4 + 2;
          const left = Math.random() * 100;
          const duration = Math.random() * 12 + 8;
          const delay = Math.random() * 8;
          return (
            <div key={i} style={{
              position: 'absolute', bottom: '-10px', left: `${left}%`,
              width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              animation: `floatUp ${duration}s linear infinite`,
              animationDelay: `${delay}s`
            }} />
          );
        })}
        <style>{`
          @keyframes floatUp {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (decorations === 'falling-sakura') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[...Array(12)].map((_, i) => {
          const size = Math.random() * 10 + 6;
          const left = Math.random() * 100;
          const duration = Math.random() * 15 + 10;
          const delay = Math.random() * 10;
          return (
            <div key={i} style={{
              position: 'absolute', top: '-20px', left: `${left}%`,
              width: size, height: size, borderRadius: '100% 0% 100% 100%',
              background: 'linear-gradient(135deg, #fda4af, #f43f5e)',
              opacity: 0.7,
              animation: `fallDiagonal ${duration}s linear infinite`,
              animationDelay: `${delay}s`
            }} />
          );
        })}
        <style>{`
          @keyframes fallDiagonal {
            0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(110vh) translateX(-200px) rotate(360deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}

import Suspended from './pages/Suspended';
import useInjectLogout from './hooks/useInjectLogout';

function AppShell() {
  const { state, dispatch } = useApp();
  const theme = state.config?.theme;

  // Run dynamic logout button injection
  useInjectLogout();

  useEffect(() => {
    if (theme) {
      import('./services/themeEngine').then(({ applyDynamicTheme }) => {
        applyDynamicTheme(theme);
      });
    }
  }, [theme]);

  const handleLogin = (user) => {
    dispatch({ type: 'SWITCH_USER', payload: { user, cached: readUserState(user) } });
  };

  const handleLogout = () => {
    revokeToken();
    dispatch({ type: 'RESET_SESSION' });
    window.location.reload();
  };

  if (!state.isAuthReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        Restoring your secure session...
      </div>
    );
  }

  if (state.isSuspended) {
    return <Suspended />;
  }

  if (!state.isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (!state.isSessionReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        {state.initializationError || 'Verifying your isolated workspace...'}
      </div>
    );
  }

  if (state.onboardingStatus === 'incomplete') {
    return <Onboarding />;
  }

  if (state.onboardingStatus !== 'complete') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        Confirming onboarding status from your workspace...
      </div>
    );
  }

  const layout = theme?.layout || 'left-sidebar';
  const showSidebar = layout === 'left-sidebar' || layout === 'right-sidebar';
  
  let mainContainerStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    transition: 'margin 0.3s ease'
  };

  if (layout === 'left-sidebar') {
    mainContainerStyle.marginLeft = state.sidebarOpen ? '220px' : '56px';
    mainContainerStyle.marginRight = '0px';
  } else if (layout === 'right-sidebar') {
    mainContainerStyle.marginRight = state.sidebarOpen ? '220px' : '56px';
    mainContainerStyle.marginLeft = '0px';
  } else {
    mainContainerStyle.marginLeft = '0px';
    mainContainerStyle.marginRight = '0px';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', flexDirection: layout === 'right-sidebar' ? 'row-reverse' : 'row' }}>
      {showSidebar && <Sidebar />}
      <div style={mainContainerStyle}>
        {layout === 'topbar' ? <Topbar /> : <Header onLogout={handleLogout} />}
        <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', paddingTop: '24px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/logger" element={<AILogger />} />
            <Route path="/transactions" element={<AllExpenses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/goals" element={<SavingsGoals />} />
            <Route path="/bills" element={<BillCalendar />} />
            <Route path="/report" element={<MonthlyReport />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/settings" element={<Settings />} />
            {state.isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
            <Route path="/section/:sectionId" element={<DynamicSectionRoute />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
      <NewSectionToast />
      <ThemeEffects />
    </div>
  );
}

function DynamicSectionRoute() {
  const { sectionId } = useParams();
  const navigate = useNavigate(); // DynamicSection might need routing, let's keep router context
  return <DynamicSection sectionId={sectionId} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}
