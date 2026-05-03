import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { NotificationBanner } from '../components/NotificationBanner';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname;
    if (path === '/transactions') return 'transactions';
    if (path === '/recurring-payments') return 'recurring-payments';
    if (path === '/cards') return 'cards';
    if (path === '/analytics') return 'analytics';
    if (path === '/settings') return 'settings';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/savings') return 'savings';
    return 'dashboard';
  });

  useEffect(() => {
    const path = location.pathname;
    if (path === '/transactions') setActiveTab('transactions');
    else if (path === '/recurring-payments') setActiveTab('recurring-payments');
    else if (path === '/cards') setActiveTab('cards');
    else if (path === '/analytics') setActiveTab('analytics');
    else if (path === '/settings') setActiveTab('settings');
    else if (path === '/dashboard') setActiveTab('dashboard');
    else if (path === '/savings') setActiveTab('savings');
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'transactions') {
      navigate('/transactions');
    } else if (tab === 'recurring-payments') {
      navigate('/recurring-payments');
    } else if (tab === 'cards') {
      navigate('/cards');
    } else if (tab === 'analytics') {
      navigate('/analytics');
    } else if (tab === 'settings') {
      navigate('/settings');
    } else if (tab === 'dashboard') {
      navigate('/dashboard');
    } else if (tab === 'savings') {
      navigate('/savings');
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NotificationBanner />
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header */}
        <header className="h-16 flex items-center px-4 lg:px-6 justify-between lg:justify-end bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
