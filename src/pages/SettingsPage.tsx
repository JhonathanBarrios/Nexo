import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag,
  Plus,
  X,
  Edit2,
  Trash2,
  Save,
  User,
  Bell,
  Shield,
  Calendar,
  Monitor,
  Smartphone,
  Laptop,
  LogOut,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories, type Category } from '../hooks/useCategories';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../api/supabase';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

const colorOptions = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-red-500 to-red-600',
  'from-green-500 to-green-600',
  'from-indigo-500 to-indigo-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-amber-500 to-amber-600',
  'from-slate-500 to-slate-600',
];

const iconOptions = [
  'Utensils', 'Car', 'Home', 'Film', 'Heart', 'ShoppingBag', 'BookOpen',
  'Coffee', 'Smartphone', 'Plane', 'Gamepad2', 'Music', 'Camera', 'Dumbbell',
  'Stethoscope', 'Briefcase', 'GraduationCap', 'Baby', 'Pet', 'Flower2',
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('categories');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currency: 'COP',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 'Monday',
    savingsGoal: 0,
    photo: null,
  });
  const [notificationSettings, setNotificationSettings] = useState({
    budgetAlerts: {
      enabled: true,
      alertAt50: true,
      alertAt80: true,
      alertAt100: true,
    },
    paymentReminders: {
      enabled: true,
      reminderDaysBefore: 3,
    },
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
  const [activeSessions] = useState([
    {
      id: 1,
      device: 'Chrome en Windows',
      location: 'Bogotá, Colombia',
      lastActive: 'Hace 5 minutos',
      current: true,
    },
    {
      id: 2,
      device: 'Safari en iPhone',
      location: 'Medellín, Colombia',
      lastActive: 'Hace 2 horas',
      current: false,
    },
    {
      id: 3,
      device: 'Firefox en macOS',
      location: 'Cali, Colombia',
      lastActive: 'Hace 1 día',
      current: false,
    },
  ]);
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
  const { user } = useAuthStore();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Tag', color: 'from-blue-500 to-blue-600', budget: '' });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        currency: 'COP',
        dateFormat: 'DD/MM/YYYY',
        firstDayOfWeek: 'Monday',
        savingsGoal: 0,
        photo: null,
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: profileData.name,
        }
      });
      
      if (error) throw error;
      
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      toast.error('Error al actualizar perfil: ' + error.message);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({ name: '', icon: 'Tag', color: 'from-blue-500 to-blue-600', budget: '' });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
      budget: category.budget_monthly?.toString() || '',
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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('No se pudo obtener el usuario');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          budget_monthly: formData.budget ? Number(formData.budget) : 0,
        });
        toast.success('Categoría actualizada correctamente');
      } else {
        await createCategory({
          user_id: user.id,
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          budget_monthly: formData.budget ? Number(formData.budget) : 0,
        });
        toast.success('Categoría creada correctamente');
      }
      setShowCategoryModal(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="w-5 h-5" /> : <Tag className="w-5 h-5" />;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-white text-3xl font-bold mb-2">Configuración</h1>
        <p className="text-slate-400">
          Personaliza tu experiencia de gestión financiera
        </p>
      </motion.div>

      {/* Settings Navigation */}
      <div className="flex gap-6 mb-8">
        <button
          onClick={() => setActiveSection('categories')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeSection === 'categories'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="w-5 h-5" />
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

      {/* Categories Section */}
      {activeSection === 'categories' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-semibold">Gestión de Categorías</h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddCategory}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              Nueva Categoría
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                whileHover={{ scale: 1.02 }}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    {getIconComponent(category.icon)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                {category.budget_monthly && (
                  <p className="text-slate-400 text-sm">Presupuesto: ${category.budget_monthly}</p>
                )}
              </motion.div>
            ))}
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

            <div className="flex justify-end mt-6">
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Meta de Ahorro Mensual
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={profileData.savingsGoal}
                    onChange={(e) => setProfileData({ ...profileData, savingsGoal: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  checked={notificationSettings.budgetAlerts.enabled}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    budgetAlerts: { ...notificationSettings.budgetAlerts, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
              </label>
            </div>

            {notificationSettings.budgetAlerts.enabled && (
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
                    checked={notificationSettings.budgetAlerts.alertAt50}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      budgetAlerts: { ...notificationSettings.budgetAlerts, alertAt50: e.target.checked }
                    })}
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
                    checked={notificationSettings.budgetAlerts.alertAt80}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      budgetAlerts: { ...notificationSettings.budgetAlerts, alertAt80: e.target.checked }
                    })}
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
                    checked={notificationSettings.budgetAlerts.alertAt100}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      budgetAlerts: { ...notificationSettings.budgetAlerts, alertAt100: e.target.checked }
                    })}
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
                  checked={notificationSettings.paymentReminders.enabled}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    paymentReminders: { ...notificationSettings.paymentReminders, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
              </label>
            </div>

            {notificationSettings.paymentReminders.enabled && (
              <div className="pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Días antes del vencimiento
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 3, 7, 14].map((days) => (
                    <button
                      key={days}
                      onClick={() => setNotificationSettings({
                        ...notificationSettings,
                        paymentReminders: { ...notificationSettings.paymentReminders, reminderDaysBefore: days }
                      })}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        notificationSettings.paymentReminders.reminderDaysBefore === days
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

          {/* Save Button */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
            >
              <Save className="w-5 h-5" />
              Guardar Cambios
            </motion.button>
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

            <div className="space-y-4">
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
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Actualizar Contraseña
              </motion.button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">Sesiones Activas</h2>
                  <p className="text-slate-400 text-sm">Administra tus dispositivos conectados</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors">
                Cerrar Todas
              </button>
            </div>

            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    session.current
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      session.current ? 'bg-green-500/20' : 'bg-slate-700'
                    }`}>
                      {session.device.includes('iPhone') || session.device.includes('Android') ? (
                        <Smartphone className="w-6 h-6 text-white" />
                      ) : session.device.includes('macOS') || session.device.includes('Windows') ? (
                        <Laptop className="w-6 h-6 text-white" />
                      ) : (
                        <Monitor className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{session.device}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">{session.location}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-sm">{session.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {session.current && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                        Actual
                      </span>
                    )}
                    {!session.current && (
                      <button className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                        <LogOut className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
              className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-800 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-2xl font-bold">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
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
                  <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-800/50 rounded-xl border border-slate-700">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-2 rounded-lg transition-all ${
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
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full h-10 rounded-lg bg-gradient-to-br ${color} transition-all ${
                          formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Presupuesto Mensual (opcional)
                  </label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

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
