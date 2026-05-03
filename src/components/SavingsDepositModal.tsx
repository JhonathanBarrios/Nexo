import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';
import type { SavingsAccount } from '../hooks/useSavingsAccounts';
import { useCards } from '../hooks/useCards';

interface SavingsDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (depositData: { amount: number; deposit_date: string; notes: string; source_card_id: string }) => void;
  account: SavingsAccount;
  suggestedAmount: number;
}

export default function SavingsDepositModal({
  isOpen,
  onClose,
  onSave,
  account,
  suggestedAmount,
}: SavingsDepositModalProps) {
  const { cards } = useCards();
  const [formData, setFormData] = useState({
    amount: '',
    deposit_date: new Date().toISOString().split('T')[0],
    notes: '',
    source_card_id: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Por favor ingresa un monto válido');
      return;
    }

    if (!formData.source_card_id) {
      toast.error('Por favor selecciona la tarjeta de origen');
      return;
    }

    onSave({
      amount,
      deposit_date: formData.deposit_date,
      notes: formData.notes,
      source_card_id: formData.source_card_id,
    });
  };

  const handleAmountPreset = (preset: number) => {
    setFormData({ ...formData, amount: String(preset) });
  };

  const remaining = account.is_goal_based && account.goal_amount
    ? account.goal_amount - account.current_balance
    : 0;
  const percentOfGoal = account.is_goal_based && account.goal_amount && account.goal_amount > 0
    ? (account.current_balance / account.goal_amount) * 100
    : 0;

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
            className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                Registrar Depósito
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-white font-medium mb-2">{account.name}</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Total acumulado:</span>
                <span className="text-white">{formatCurrency(account.current_balance)}</span>
              </div>
              {account.is_goal_based && account.goal_amount && (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Meta:</span>
                    <span className="text-white">{formatCurrency(account.goal_amount)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(percentOfGoal, 100)}%`,
                        backgroundColor: account.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-right">{percentOfGoal.toFixed(1)}% completado</p>
                </>
              )}
              {!account.is_goal_based && (
                <p className="text-xs text-slate-500">Bolsillo abierto - sin meta establecida</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monto del Depósito
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.amount ? Number(formData.amount).toLocaleString('es-CO') : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, amount: numericValue });
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                {account.is_goal_based && suggestedAmount > 0 && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleAmountPreset(suggestedAmount)}
                      className="flex-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
                    >
                      Meta: {formatCurrency(suggestedAmount)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAmountPreset(remaining)}
                      className="flex-1 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                    >
                      Restante: {formatCurrency(remaining)}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tarjeta de origen (requerido)
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={formData.source_card_id}
                    onChange={(e) => setFormData({ ...formData, source_card_id: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Seleccionar tarjeta</option>
                    {cards.filter(c => c.is_active && (c.type === 'debit' || c.type === 'prepaid')).map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} - •••• {card.last_four}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-slate-400 text-xs mt-1">De dónde sale el dinero (solo débito/prepago)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fecha del Depósito
                </label>
                <input
                  type="date"
                  value={formData.deposit_date}
                  onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ej: Aporte extra este mes"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

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
                  Registrar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
