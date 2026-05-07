import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Lock,
  Eye,
  EyeOff,
  Save,
  X,
  Calendar,
  Bell,
  Shield,
  User,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories, type Category } from '../hooks/useCategories';
import { useCategoryBudgets } from '../hooks/useCategoryBudgets';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { useUserSettings } from '../hooks/useUserSettings';
import { supabase } from '../api/supabase';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/currency';
import { convertToMonthly, periodLabels, type BudgetPeriod } from '../utils/budget';

const legacyGradientToHex: Record<string, string> = {
  'from-blue-500 to-blue-600': '#3b82f6',
  'from-purple-500 to-purple-600': '#8b5cf6',
  'from-pink-500 to-pink-600': '#ec4899',
  'from-red-500 to-red-600': '#ef4444',
  'from-green-500 to-green-600': '#10b981',
  'from-indigo-500 to-indigo-600': '#6366f1',
  'from-cyan-500 to-cyan-600': '#06b6d4',
  'from-orange-500 to-orange-600': '#f97316',
  'from-amber-500 to-amber-600': '#f59e0b',
  'from-slate-500 to-slate-600': '#64748b',
};

const iconOptions = [
  // Comida
  'Utensils', 'Pizza', 'Coffee', 'IceCream', 'Burger', 'Beef', 'UtensilsCrossed',
  // Transporte
  'Car', 'Plane', 'Bike', 'Train', 'Bus', 'Ship', 'Fuel',
  // Hogar
  'Home', 'Sofa', 'Tv', 'Lamp', 'Refrigerator', 'WashingMachine',
  // Entretenimiento
  'Film', 'Gamepad2', 'Music', 'Camera', 'Headphones', 'Gamepad',
  // Compras
  'ShoppingBag', 'ShoppingCart', 'Shirt', 'Watch', 'Gift', 'Package',
  // Salud
  'Stethoscope', 'Pill', 'Syringe', 'Activity', 'HeartPulse',
  // Finanzas
  'Wallet', 'PiggyBank', 'CreditCard', 'Banknote', 'TrendingUp', 'TrendingDown', 'DollarSign',
  // Servicios
  'Wifi', 'Zap', 'Cpu', 'Server', 'Database', 'WifiOff',
  // Educación
  'BookOpen', 'GraduationCap', 'School', 'PenTool',
  // Trabajo
  'Briefcase', 'Building2', 'Laptop', 'Monitor',
  // Otros
  'Heart', 'Smartphone', 'Dumbbell', 'Baby', 'Pet', 'Flower2', 'Calendar', 'Bell', 'Shield',
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('categories');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currency: 'COP',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 'Monday',
    photo: null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const { saveBudget } = useCategoryBudgets();
  const { user, updatePassword } = useAuthStore();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings } = useNotifications(user?.id);
  const { settings: userSettings, updateSettings: updateUserSettings } = useUserSettings();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Tag', color: '#3b82f6', budget: '', budget_period: 'monthly' });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  });

  const getColorPickerValue = (color: string): string => {
    if (color?.startsWith('#')) return color;
    return legacyGradientToHex[color] || '#3b82f6';
  };

  const getCategoryColorStyle = (color: string) => {
    if (color?.startsWith('#')) {
      return { style: { backgroundColor: color }, className: '' };
    }

    return { style: undefined, className: `bg-gradient-to-br ${color || 'from-blue-500 to-blue-600'}` };
  };

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        currency: userSettings?.currency || 'COP',
        dateFormat: userSettings?.date_format || 'DD/MM/YYYY',
        firstDayOfWeek: userSettings?.first_day_of_week || 'Monday',
        photo: null,
      });
    }
  }, [user, userSettings]);

  const handleUpdateProfile = async () => {
    try {
      // Actualizar nombre en Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          name: profileData.name,
        }
      });
      
      if (error) throw error;

      // Actualizar configuraciones en user_settings
      await updateUserSettings({
        currency: profileData.currency,
        date_format: profileData.dateFormat,
        first_day_of_week: profileData.firstDayOfWeek,
      });
      
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      toast.error('Error al actualizar perfil: ' + error.message);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({ name: '', icon: 'Tag', color: '#3b82f6', budget: '', budget_period: 'monthly' });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: getColorPickerValue(category.color),
      budget: category.budget_amount?.toString() || '',
      budget_period: category.budget_period || 'monthly',
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    setConfirmDialog({
      isOpen: true,
      onConfirm: () => {
        deleteCategory(id);
        toast.success(`Categoría "${category.name}" eliminada correctamente`);
      },
      title: 'Eliminar Categoría',
      message: `¿Estás seguro de eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`,
    });
  };

  // Función auxiliar para calcular equivalente mensual
  const calculateMonthlyEquivalent = (amount: number, period: string): number => {
    return convertToMonthly(amount, period as BudgetPeriod);
  };

  // Función auxiliar para calcular el rango de fechas del presupuesto
  const calculateBudgetDateRange = (period: string): { start_date: string; end_date: string } => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let startDate: Date;
    let endDate: Date;

    if (period === 'biweekly') {
      if (currentDay <= 15) {
        // Primera quincena: 1-15
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = new Date(currentYear, currentMonth, 15);
      } else {
        // Segunda quincena: 16-fin de mes
        startDate = new Date(currentYear, currentMonth, 16);
        endDate = new Date(currentYear, currentMonth + 1, 0);
      }
    } else if (period === 'monthly') {
      // Todo el mes
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth + 1, 0);
    } else {
      // Default: mes actual
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth + 1, 0);
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('No se pudo obtener el usuario');
      return;
    }

    try {
      let categoryId: string;

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          budget_amount: formData.budget ? Number(formData.budget) : 0,
          budget_period: formData.budget_period,
          budget_monthly: formData.budget ? calculateMonthlyEquivalent(Number(formData.budget), formData.budget_period) : 0,
        });
        categoryId = editingCategory.id;
        toast.success('Categoría actualizada correctamente');
      } else {
        const newCategory = await createCategory({
          user_id: user.id,
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          budget_amount: formData.budget ? Number(formData.budget) : 0,
          budget_period: formData.budget_period,
          budget_monthly: formData.budget ? calculateMonthlyEquivalent(Number(formData.budget), formData.budget_period) : 0,
        });
        categoryId = newCategory.id;
        toast.success('Categoría creada correctamente');
      }

      // Guardar historial de presupuesto si hay un presupuesto establecido
      if (formData.budget && Number(formData.budget) > 0) {
        const { start_date, end_date } = calculateBudgetDateRange(formData.budget_period);
        await saveBudget({
          category_id: categoryId,
          budget_amount: Number(formData.budget),
          budget_period: formData.budget_period,
          start_date,
          end_date,
        });
      }

      setShowCategoryModal(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Contraseña actualizada correctamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <LucideIcons.Tag className="w-5 h-5" />;
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">Configuración</h1>
        <p className="text-slate-400 text-sm md:text-base">
          Personaliza tu experiencia de gestión financiera
        </p>
      </motion.div>

      {/* Settings Navigation - Mobile Friendly */}
      <div className="mb-6">
        {/* Mobile: Scrollable horizontal tabs with better sizing */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 md:hidden scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setActiveSection('categories')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              activeSection === 'categories'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <LucideIcons.Tag className="w-3.5 h-3.5" />
            Categorías
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              activeSection === 'profile'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Perfil
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              activeSection === 'notifications'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notif.
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              activeSection === 'security'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Seguridad
          </button>
        </div>

        {/* Desktop: Horizontal buttons */}
        <div className="hidden md:flex gap-4">
          <button
            onClick={() => setActiveSection('categories')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeSection === 'categories'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <LucideIcons.Tag className="w-5 h-5" />
            Categorías
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeSection === 'profile'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            Perfil
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeSection === 'notifications'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" />
            Notificaciones
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeSection === 'security'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-5 h-5" />
            Seguridad
          </button>
        </div>
      </div>

      {/* Categories Section */}
      {activeSection === 'categories' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3">
            <h2 className="text-white text-lg md:text-xl font-semibold">Gestión de Categorías</h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              Nueva Categoría
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {categories.map((category) => {
              const colorConfig = getCategoryColorStyle(category.color);
              return (
              <motion.div
                key={category.id}
                whileHover={{ scale: 1.02 }}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${colorConfig.className}`}
                    style={colorConfig.style}
                  >
                    {getIconComponent(category.icon)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-1">{category.name}</h3>
                {category.budget_amount && category.budget_amount > 0 && (
                  <p className="text-slate-400 text-sm">
                    Presupuesto {periodLabels[category.budget_period as BudgetPeriod]}: {formatCurrency(category.budget_amount)}
                  </p>
                )}
              </motion.div>
            )})}
          </div>
        </motion.div>
      )}

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Personal Information */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
            <h2 className="text-white text-xl font-semibold mb-6">Información Personal</h2>
            
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {profileData.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                  Cambiar Foto
                </button>
                <p className="text-slate-400 text-sm mt-2">JPG, PNG o GIF. Máximo 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
                />
                <p className="text-slate-500 text-xs mt-1">El email no se puede cambiar</p>
              </div>
            </div>
          </div>

          {/* Financial Preferences */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
            <h2 className="text-white text-xl font-semibold mb-6">Preferencias Financieras</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Moneda Principal
                </label>
                <select
                  value={profileData.currency}
                  onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="COP">COP - Peso Colombiano</option>
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="PEN">PEN - Sol Peruano</option>
                  <option value="CLP">CLP - Peso Chileno</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Formato de Fecha
                </label>
                <select
                  value={profileData.dateFormat}
                  onChange={(e) => setProfileData({ ...profileData, dateFormat: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (30/04/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (04/30/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-04-30)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Primer Día de la Semana
                </label>
                <select
                  value={profileData.firstDayOfWeek}
                  onChange={(e) => setProfileData({ ...profileData, firstDayOfWeek: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="Monday">Lunes</option>
                  <option value="Sunday">Domingo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdateProfile}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
            >
              <Save className="w-5 h-5" />
              Guardar Cambios
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Notifications Section */}
      {activeSection === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Budget Alerts */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">Alertas de Presupuesto</h2>
                  <p className="text-slate-400 text-sm">Recibe alertas cuando te acerques a tu límite</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.budget_alerts_enabled}
                  onChange={(e) => updateNotificationSettings({ budget_alerts_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
              </label>
            </div>

            {notificationSettings.budget_alerts_enabled && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-400 font-semibold">50%</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Alerta al 50% del presupuesto</p>
                      <p className="text-slate-400 text-sm">Notifica cuando gastes la mitad del presupuesto</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_at_50}
                    onChange={(e) => updateNotificationSettings({ alert_at_50: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-orange-400 font-semibold">80%</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Alerta al 80% del presupuesto</p>
                      <p className="text-slate-400 text-sm">Notifica cuando estés cerca del límite</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_at_80}
                    onChange={(e) => updateNotificationSettings({ alert_at_80: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-red-400 font-semibold">100%</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">Alerta al 100% del presupuesto</p>
                      <p className="text-slate-400 text-sm">Notifica cuando excedas el presupuesto</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.alert_at_100}
                    onChange={(e) => updateNotificationSettings({ alert_at_100: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Payment Reminders */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">Recordatorios de Pagos</h2>
                  <p className="text-slate-400 text-sm">Recibe alertas antes de vencimientos</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.payment_reminders_enabled}
                  onChange={(e) => updateNotificationSettings({ payment_reminders_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
              </label>
            </div>

            {notificationSettings.payment_reminders_enabled && (
              <div className="pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Días antes del vencimiento
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 3, 7, 14].map((days) => (
                    <button
                      key={days}
                      onClick={() => updateNotificationSettings({ reminder_days_before: days })}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        notificationSettings.reminder_days_before === days
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-slate-800/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      {days} día{days !== 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Change Password */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-semibold">Cambiar Contraseña</h2>
                <p className="text-slate-400 text-sm">Actualiza tu contraseña para mayor seguridad</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Actualizar Contraseña
              </motion.button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-4 md:p-8 max-w-md w-full border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-white text-xl md:text-2xl font-bold">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Alimentación"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Icono
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-800/50 rounded-xl border border-slate-700">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                          formData.icon === icon
                            ? 'bg-blue-500/20 border border-blue-500'
                            : 'hover:bg-slate-700'
                        }`}
                      >
                        {getIconComponent(icon)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="template-color-input w-full h-10 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Presupuesto (opcional)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.budget ? Number(formData.budget).toLocaleString('es-CO') : ''}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, budget: numericValue });
                      }}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {formData.budget && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Período del Presupuesto
                    </label>
                    <select
                      value={formData.budget_period}
                      onChange={(e) => setFormData({ ...formData, budget_period: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      <option value="biweekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
      />
    </div>
  );
}
