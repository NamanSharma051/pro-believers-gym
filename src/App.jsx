import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { getConfig, getMembers } from './store';
import { LayoutGrid, Users, IndianRupee, Settings as SettingsIcon, TrendingUp, Bell } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Lazy load all tabs — only loads what's needed
const Dashboard  = lazy(() => import('./components/Dashboard'));
const Members    = lazy(() => import('./components/Members'));
const Financials = lazy(() => import('./components/Financials'));
const Settings   = lazy(() => import('./components/Settings'));
const Analytics  = lazy(() => import('./components/Analytics'));
const Expiry     = lazy(() => import('./components/Expiry'));

export default function App() {
  const [activeTab, setActiveTab]   = useState('Dashboard');
  const [gymName, setGymName]       = useState('PRO BELIEVERS GYM');
  const [alertCount, setAlertCount] = useState(0);

  // Init ONCE on mount — not on every tab change
  useEffect(() => {
    (async () => {
      const config = await getConfig();
      setGymName(config.name || 'PRO BELIEVERS GYM');
      if (config.theme === 'light') document.documentElement.classList.add('light');
      else document.documentElement.classList.remove('light');

      const members = await getMembers();
      const now = new Date();
      const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      setAlertCount(members.filter(m => m.expiryDate && new Date(m.expiryDate) <= in2days).length);
    })();
  }, []);

  // Refresh alert count only when going to Expiry or coming back
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'Expiry' || activeTab === 'Expiry') {
      getMembers().then(members => {
        const now = new Date();
        const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        setAlertCount(members.filter(m => m.expiryDate && new Date(m.expiryDate) <= in2days).length);
      });
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--bg)] text-[var(--text-main)] overflow-hidden font-sans relative">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--card-border)' },
          duration: 2000
        }}
      />

      <header className="px-5 pt-5 pb-3 flex justify-between items-center bg-[var(--header-bg)] border-b border-white/5">
        <h1 className="text-xl font-bold syne tracking-tight truncate">{gymName}</h1>
        <button
          onClick={() => handleTabChange('Expiry')}
          className={`w-10 h-10 glass-card flex items-center justify-center relative ${activeTab === 'Expiry' ? 'text-orange-500 border-orange-500/30' : 'text-gray-600'}`}
        >
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center text-white">
              {alertCount}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 hide-scrollbar">
        {/* No AnimatePresence / framer-motion — CSS transition instead, much faster */}
        <Suspense fallback={<LoadingScreen />}>
          {activeTab === 'Dashboard'  && <Dashboard setActiveTab={handleTabChange} />}
          {activeTab === 'Members'    && <Members onMemberChange={() => {
            getMembers().then(members => {
              const now = new Date();
              const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
              setAlertCount(members.filter(m => m.expiryDate && new Date(m.expiryDate) <= in2days).length);
            });
          }} />}
          {activeTab === 'Financials' && <Financials />}
          {activeTab === 'Analytics'  && <Analytics />}
          {activeTab === 'Expiry'     && <Expiry />}
          {activeTab === 'Settings'   && <Settings onNameChange={setGymName} />}
        </Suspense>
      </main>

      <nav className="flex justify-around items-center px-2 pb-8 pt-3 bg-[var(--nav-bg)] border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <TabItem icon={LayoutGrid}    label="Home"    active={activeTab === 'Dashboard'}  onClick={() => handleTabChange('Dashboard')} />
        <TabItem icon={Users}         label="Members" active={activeTab === 'Members'}    onClick={() => handleTabChange('Members')} />
        <TabItem icon={Bell}          label="Alerts"  active={activeTab === 'Expiry'}     onClick={() => handleTabChange('Expiry')} badge={alertCount} />
        <TabItem icon={TrendingUp}    label="Stats"   active={activeTab === 'Analytics'}  onClick={() => handleTabChange('Analytics')} />
        <TabItem icon={SettingsIcon}  label="Tools"   active={activeTab === 'Settings'}   onClick={() => handleTabChange('Settings')} />
      </nav>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function TabItem({ icon: Icon, label, active, onClick, badge = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-1 relative transition-colors ${active ? 'text-orange-500' : 'text-gray-600'}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="relative">
        <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black flex items-center justify-center text-white">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[9px] font-black tracking-widest uppercase">{label}</span>
    </button>
  );
}