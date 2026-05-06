import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PiggyBank, Calendar, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';

interface SavingsAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountData: any) => void;
  editingAccount?: any;
}

const frequencyOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

export default function SavingsAccountModal({
  isOpen,
  onClose,
  onSave,
  editingAccount,
}: SavingsAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    is_goal_based: true,
    goal_amount: '',
    goal_duration_months: '6',
    frequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly',
    deposit_day: 1,
    start_date: new Date().toISOString().split('T')[0],
    color: '#10b981',
    icon: 'piggy-bank',
  });

  const [showDepositDayPicker, setShowDepositDayPicker] = useState(false);

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        name: editingAccount.name || '',
        is_goal_based: editingAccount.is_goal_based ?? true,
        goal_amount: editingAccount.goal_amount ? String(editingAccount.goal_amount) : '',
        goal_duration_months: String(editingAccount.goal_duration_months || 6),
        frequency: editingAccount.frequency || 'monthly',
        deposit_day: editingAccount.deposit_day || 1,
        start_date: editingAccount.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        color: editingAccount.color || '#10b981',
        icon: editingAccount.icon || 'piggy-bank',
      });
    } else {
      setFormData({
        name: '',
        is_goal_based: true,
        goal_amount: '',
        goal_duration_months: '6',
        frequency: 'monthly',
        deposit_day: 1,
        start_date: new Date().toISOString().split('T')[0],
        color: '#10b981',
        icon: 'piggy-bank',
      });
    }
    setShowDepositDayPicker(false);
  }, [editingAccount, isOpen]);

  const calculateEndDate = () => {
    const start = new Date(formData.start_date);
    const duration = parseInt(formData.goal_duration_months) || 0;
    const end = new Date(start);
    end.setMonth(end.getMonth() + duration);
    return end;
  };

  const calculateTotalDeposits = () => {
    const duration = parseInt(formData.goal_duration_months) || 0;
    const multipliers: Record<string, number> = { weekly: 4, biweekly: 2, monthly: 1 };
    return duration * (multipliers[formData.frequency] || 1);
  };

  const calculateGoalPerPeriod = () => {
    const goal = parseFloat(formData.goal_amount) || 0;
    const totalDeposits = calculateTotalDeposits();
    return totalDeposits > 0 ? goal / totalDeposits : 0;
  };

  const getValidDepositDays = () => {
    const days: number[] = [];
    const frequency = formData.frequency;

    if (frequency === 'monthly') {
      // Para mensual, mostrar todos los días del mes (1-31)
      for (let day = 1; day <= 31; day++) {
        days.push(day);
      }
    } else if (frequency === 'weekly') {
      // Para semanal, mostrar días cada 7 días
      for (let day = 1; day <= 31; day += 7) {
        days.push(day);
      }
    } else if (frequency === 'biweekly') {
      // Para quincenal, mostrar días cada 14 días
      for (let day = 1; day <= 31; day += 14) {
        days.push(day);
      }
    }

    return [...new Set(days)].sort((a, b) => a - b);
  };

  const handleDepositDaySelect = (day: number) => {
    setFormData({ ...formData, deposit_day: day });
    setShowDepositDayPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Por favor ingresa el nombre del bolsillo');
      return;
    }

    if (formData.is_goal_based) {
      if (!formData.goal_amount || parseFloat(formData.goal_amount) <= 0) {
        toast.error('Por favor ingresa una meta de ahorro válida');
        return;
      }
      if (!formData.goal_duration_months || parseInt(formData.goal_duration_months) <= 0) {
        toast.error('Por favor ingresa una duración válida');
        return;
      }
      if (parseInt(formData.goal_duration_months) > 24) {
        toast.error('La duración máxima es de 24 meses');
        return;
      }
    }

    const accountData = {
      name: formData.name,
      is_goal_based: formData.is_goal_based,
      goal_amount: formData.is_goal_based ? parseFloat(formData.goal_amount) : null,
      goal_duration_months: formData.is_goal_based ? parseInt(formData.goal_duration_months) : null,
      frequency: formData.is_goal_based ? formData.frequency : null,
      deposit_day: formData.is_goal_based ? parseInt(String(formData.deposit_day)) : null,
      start_date: formData.is_goal_based ? formData.start_date : null,
      color: formData.color,
      icon: formData.icon,
    };

    onSave(accountData);
  };

  const endDate = calculateEndDate();
  const totalDeposits = calculateTotalDeposits();
  const goalPerPeriod = calculateGoalPerPeriod();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingAccount ? 'Editar Bolsillo' : 'Nuevo Bolsillo de Ahorro'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Ahorro con Meta
                  </label>
                  <p className="text-xs text-slate-500">
                    {formData.is_goal_based
                      ? 'Define una meta y recibe recordatorios'
                      : 'Ahorra libremente sin compromisos'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_goal_based: !formData.is_goal_based })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.is_goal_based ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={{ x: formData.is_goal_based ? 24 : 0 }}
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del Bolsillo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Viaje de cumpleaños"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formData.is_goal_based && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Meta de Ahorro
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={formData.goal_amount ? Number(formData.goal_amount).toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, goal_amount: numericValue });
                        }}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Duración (meses)
                      </label>
                      <input
                        type="number"
                        value={formData.goal_duration_months}
                        onChange={(e) => setFormData({ ...formData, goal_duration_months: e.target.value })}
                        placeholder="6"
                        min="1"
                        max="24"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Frecuencia
                      </label>
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {frequencyOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Día de Depósito
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDepositDayPicker(!showDepositDayPicker)}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                    >
                      <span>Día {formData.deposit_day}</span>
                      <Calendar className="w-5 h-5 text-slate-400" />
                    </button>
                    {showDepositDayPicker && (
                      <div className="mt-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-7 gap-2">
                          {getValidDepositDays().map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDepositDaySelect(day)}
                              className={`p-2 rounded-lg text-center transition-all ${
                                formData.deposit_day === day
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Selecciona el día en que harás tus depósitos de ahorro
                    </p>
                  </div>
                </>
              )}

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

              {formData.is_goal_based && !editingAccount && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-emerald-400" />
                    Resumen del Plan
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha de inicio:</span>
                      <span className="text-white">{formData.start_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha de fin:</span>
                      <span className="text-white">{endDate.toISOString().split('T')[0]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Depósitos totales:</span>
                      <span className="text-white">{totalDeposits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Meta por período:</span>
                      <span className="text-emerald-400 font-medium">
                        {formatCurrency(goalPerPeriod)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!formData.is_goal_based && (
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Este bolsillo es abierto. Podrás depositar cuando quieras, sin recordatorios ni obligaciones.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-medium hover:text-white hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
                >
                  {editingAccount ? 'Guardar' : 'Crear Bolsillo'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
