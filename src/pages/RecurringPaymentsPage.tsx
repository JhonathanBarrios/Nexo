import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Repeat,
  Plus,
  X,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle,
  ToggleLeft,
  MoreVertical,
  Power,
  PowerOff,
} from 'lucide-react';
import { useRecurringPayments, type RecurringPayment } from '../hooks/useRecurringPayments';
import { useCategories } from '../hooks/useCategories';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/currency';

const frequencyLabels = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
  custom: 'Personalizado',
};

export default function RecurringPaymentsPage() {
  const { payments, createPayment, updatePayment, deletePayment } = useRecurringPayments();
  const { categories } = useCategories();
  const { user } = useAuthStore();
  
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  });
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category_id: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    next_due_date: new Date().toISOString().split('T')[0],
    custom_days: '',
  });

  const filteredPayments = payments
    .filter((p) => {
      const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && p.is_active) ||
        (filterStatus === 'inactive' && !p.is_active);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());

  const handleEdit = (payment: RecurringPayment) => {
    setEditingPayment(payment);
    setFormData({
      description: payment.description,
      amount: payment.amount.toString(),
      category_id: payment.category_id || '',
      frequency: payment.frequency,
      next_due_date: payment.next_due_date,
      custom_days: payment.custom_days?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = (payment: RecurringPayment) => {
    setConfirmDialog({
      isOpen: true,
      onConfirm: async () => {
        await deletePayment(payment.id);
        toast.success('Pago recurrente eliminado correctamente');
      },
      title: 'Eliminar Pago Recurrente',
      message: `¿Estás seguro de eliminar "${payment.description}"? Esta acción no se puede deshacer.`,
    });
  };

  const handleToggleActive = async (payment: RecurringPayment) => {
    try {
      await updatePayment(payment.id, { is_active: !payment.is_active });
      toast.success(payment.is_active ? 'Pago desactivado' : 'Pago activado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      if (editingPayment) {
        await updatePayment(editingPayment.id, {
          category_id: formData.category_id || null,
          description: formData.description,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          next_due_date: formData.next_due_date,
          custom_days: formData.frequency === 'custom' ? parseInt(formData.custom_days) : null,
        });
        toast.success('Pago recurrente actualizado correctamente');
      } else {
        await createPayment({
          user_id: user.id,
          category_id: formData.category_id || null,
          description: formData.description,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          next_due_date: formData.next_due_date,
          custom_days: formData.frequency === 'custom' ? parseInt(formData.custom_days) : null,
          is_active: true,
        });
        toast.success('Pago recurrente creado correctamente');
      }
      setShowModal(false);
      setEditingPayment(null);
      setFormData({
        description: '',
        amount: '',
        category_id: '',
        frequency: 'monthly',
        next_due_date: new Date().toISOString().split('T')[0],
        custom_days: '',
      });
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCategory = (categoryId: string | null) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">Pagos Recurrentes</h1>
            <p className="text-slate-400 text-sm lg:text-base">
              Gestiona tus suscripciones y pagos automáticos
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingPayment(null);
              setFormData({
                description: '',
                amount: '',
                category_id: '',
                frequency: 'monthly',
                next_due_date: new Date().toISOString().split('T')[0],
                custom_days: '',
              });
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Pago Recurrente</span>
            <span className="sm:hidden">Nuevo</span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar pagos..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilterStatus('all')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Todos
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilterStatus('active')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  filterStatus === 'active'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Activos
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilterStatus('inactive')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  filterStatus === 'inactive'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Inactivos
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payments List */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h3 className="text-white text-base lg:text-lg font-semibold">
            {filteredPayments.length} Pagos Recurrentes
          </h3>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredPayments.map((payment, index) => {
              const category = getCategory(payment.category_id);
              const daysUntilDue = getDaysUntilDue(payment.next_due_date);
              const isOverdue = daysUntilDue < 0;
              const isUpcoming = daysUntilDue >= 0 && daysUntilDue <= 7;
              
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl border ${
                    !payment.is_active
                      ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                      : isOverdue
                      ? 'bg-red-500/10 border-red-500/30'
                      : isUpcoming
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-800/50 border-slate-700/50'
                  } hover:bg-slate-800 transition-all`}
                >
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Repeat className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm lg:text-base truncate">{payment.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-slate-400 text-xs lg:text-sm">{category?.name || 'Sin categoría'}</span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="text-slate-400 text-xs lg:text-sm hidden sm:inline">{frequencyLabels[payment.frequency]}</span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className={`text-xs lg:text-sm ${isOverdue ? 'text-red-400' : isUpcoming ? 'text-amber-400' : 'text-slate-400'}`}>
                        {isOverdue ? `Vencido hace ${Math.abs(daysUntilDue)} días` : 
                         daysUntilDue === 0 ? 'Vence hoy' :
                         daysUntilDue === 1 ? 'Vence mañana' :
                         `Vence en ${daysUntilDue} días`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-base lg:text-xl font-bold">{formatCurrency(payment.amount).replace('COP', '').trim()}</p>
                    <p className="text-slate-400 text-xs lg:text-sm hidden sm:inline">{payment.next_due_date}</p>
                  </div>
                  <div className="relative flex items-center gap-2 flex-shrink-0">
                    {/* Desktop: Botones visibles */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(payment)}
                        className={`p-2 rounded-lg transition-colors ${
                          payment.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {payment.is_active ? <CheckCircle className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(payment)}
                        className="p-2 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(payment)}
                        className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </div>
                    {/* Mobile: Menú de 3 puntos */}
                    <div className="sm:hidden relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === payment.id ? null : payment.id)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                        {actionMenuOpen === payment.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-10 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                handleToggleActive(payment);
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                            >
                              {payment.is_active ? <PowerOff className="w-4 h-4 text-red-400" /> : <Power className="w-4 h-4 text-green-400" />}
                              <span className="text-slate-300 text-sm">{payment.is_active ? 'Desactivar' : 'Activar'}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleEdit(payment);
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                              <span className="text-slate-300 text-sm">Editar</span>
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(payment);
                                setActionMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                              <span className="text-slate-300 text-sm">Eliminar</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <Repeat className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No hay pagos recurrentes</p>
              <p className="text-slate-500 text-sm mt-2">
                Agrega tu primer pago recurrente para comenzar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white text-xl font-semibold">
                    {editingPayment ? 'Editar Pago Recurrente' : 'Nuevo Pago Recurrente'}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ej: Netflix, Alquiler, Seguro"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Monto</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="">Sin categoría</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Frecuencia</label>
                    <div className="relative">
                      <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="yearly">Anual</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>
                  </div>

                  {formData.frequency === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Días</label>
                      <input
                        type="number"
                        value={formData.custom_days}
                        onChange={(e) => setFormData({ ...formData, custom_days: e.target.value })}
                        placeholder="Número de días"
                        min="1"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Próximo Pago</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        value={formData.next_due_date}
                        onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
                  >
                    {editingPayment ? 'Guardar Cambios' : 'Agregar Pago Recurrente'}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
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