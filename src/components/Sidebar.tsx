import { motion } from 'motion/react';
import { CreditCard, LayoutDashboard, Wallet, Repeat, PieChart, Settings, LogOut, X, PiggyBank } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onOpenChange }: SidebarProps) {
  const { user, signOut } = useAuthStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transacciones', icon: Wallet },
    { id: 'recurring-payments', label: 'Pagos Recurrentes', icon: Repeat },
    { id: 'savings', label: 'Ahorro', icon: PiggyBank },
    { id: 'cards', label: 'Tarjetas', icon: CreditCard },
    { id: 'analytics', label: 'Análisis', icon: PieChart },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const getUserInitials = () => {
    if (!user?.user_metadata?.name) return 'U';
    return user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => onOpenChange?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className="hidden lg:block w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">Nexo</h1>
              <p className="text-slate-400 text-xs">Gestor Personal</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                whileHover={{ x: 4 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">{getUserInitials()}</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{user?.user_metadata?.name || 'Usuario'}</p>
                <p className="text-slate-400 text-xs">{user?.email || ''}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <motion.div
        initial={{ x: -256 }}
        animate={{ x: isOpen ? 0 : -256 }}
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => onOpenChange?.(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">Nexo</h1>
              <p className="text-slate-400 text-xs">Gestor Personal</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onOpenChange?.(false);
                }}
                whileHover={{ x: 4 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">{getUserInitials()}</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">{user?.user_metadata?.name || 'Usuario'}</p>
                <p className="text-slate-400 text-xs">{user?.email || ''}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
