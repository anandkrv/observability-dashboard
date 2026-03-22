import { useState, useEffect } from 'react';
import { useFilterStore } from './store/filterStore.js';
import { useAuthStore }   from './store/authStore.js';
import { SideNav }        from './components/SideNav/SideNav.jsx';
import LoginPage          from './pages/LoginPage.jsx';
import Dashboard          from './pages/Dashboard.jsx';
import CIBuildMetrics     from './pages/CIBuildMetrics.jsx';
import Settings           from './pages/Settings.jsx';
import ChatBot            from './components/ChatBot/ChatBot.jsx';

function App() {
  const theme  = useFilterStore((s) => s.theme);
  const user   = useAuthStore((s) => s.user);
  const [activePage, setActivePage] = useState('release');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Redirect away from admin-only pages if role changes
  useEffect(() => {
    if (activePage === 'settings' && user?.role !== 'admin') {
      setActivePage('release');
    }
  }, [user, activePage]);

  if (!user) return <LoginPage />;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-base)' }}>
      <SideNav activePage={activePage} onNavigate={setActivePage} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {activePage === 'release'    && <Dashboard />}
        {activePage === 'ci-metrics' && <CIBuildMetrics />}
        {activePage === 'settings'   && user?.role === 'admin' && <Settings />}
      </div>
      <ChatBot activePage={activePage} />
    </div>
  );
}

export default App;
