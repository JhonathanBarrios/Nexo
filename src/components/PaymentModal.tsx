import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, payAllPending: boolean, installmentsToPay: number) => void;
  payment: {
    description: string;
    amount: number | null;
    pending_cycles: number;
    total_pending_amount: number;
    is_variable?: boolean;
    is_installment?: boolean;
    total_cycles?: number | null;
    remaining_cycles?: number | null;
  } | null;
  loading?: boolean;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  payment,
  loading = false,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('0');
  const [payAllPending, setPayAllPending] = useState(true);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [installmentsToPay, setInstallmentsToPay] = useState(1);

  const remainingInstallments = payment?.remaining_cycles || 0;
  const amountPerInstallment = Number(payment?.amount || 0);
  const totalPending = payment?.is_variable ? payment?.total_pending_amount : (payment?.pending_cycles || 0) * (payment?.amount || 0);
  const installmentAmount = amountPerInstallment * installmentsToPay;
  const currentAmount = payment?.is_installment
    ? installmentAmount
    : (payAllPending ? totalPending : parseFloat(amount || '0'));

  // Actualizar el amount cuando cambia el payment
  useEffect(() => {
    if (payment) {
      if (payment.is_installment) {
        setInstallmentsToPay(1);
        setAmount(String(amountPerInstallment));
      } else {
        setAmount(totalPending.toString());
      }
    }
  }, [payment, totalPending, amountPerInstallment]);

  if (!payment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(currentAmount, payAllPending, installmentsToPay);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                <h2 className="text-white text-xl font-semibold">Pagar: {payment.description}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mostrar ciclos pendientes */}
                {!payment.is_variable && payment.pending_cycles > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Pagos pendientes</span>
                    </div>
                    <p className="text-slate-300 text-sm">
                      Tienes {payment.pending_cycles} ciclo{payment.pending_cycles > 1 ? 's' : ''} pendiente{payment.pending_cycles > 1 ? 's' : ''}
                    </p>
                    <p className="text-amber-400 text-lg font-semibold mt-1">
                      Total acumulado: {formatCurrency(totalPending)}
                    </p>
                  </div>
                )}

                {payment.is_installment ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm font-medium mb-2">Pago a cuotas</p>
                    <p className="text-slate-300 text-sm">
                      Cuotas pendientes: {remainingInstallments}
                      {payment.total_cycles ? ` de ${payment.total_cycles}` : ''}
                    </p>
                    <p className="text-slate-300 text-sm mt-1">
                      Valor por cuota: {formatCurrency(amountPerInstallment)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de pago</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentType('full');
                          setPayAllPending(payment.pending_cycles > 0);
                          setAmount(totalPending.toString());
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          paymentType === 'full'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className={`w-5 h-5 ${paymentType === 'full' ? 'text-blue-400' : 'text-slate-400'}`} />
                          <span className={`font-medium ${paymentType === 'full' ? 'text-white' : 'text-slate-300'}`}>
                            Pago Completo
                          </span>
                        </div>
                        <p className={`text-xs ${paymentType === 'full' ? 'text-slate-300' : 'text-slate-500'}`}>
                          {payment.pending_cycles > 0 ? `Pagar todo lo pendiente (${formatCurrency(totalPending)})` : `Pagar ${formatCurrency(payment.amount || 0)}`}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentType('partial');
                          setPayAllPending(false);
                          setAmount('');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          paymentType === 'partial'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className={`w-5 h-5 ${paymentType === 'partial' ? 'text-purple-400' : 'text-slate-400'}`} />
                          <span className={`font-medium ${paymentType === 'partial' ? 'text-white' : 'text-slate-300'}`}>
                            Abono
                          </span>
                        </div>
                        <p className={`text-xs ${paymentType === 'partial' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Pagar un monto parcial
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {payment.is_installment && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cuotas a pagar ahora</label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, remainingInstallments)}
                      value={installmentsToPay}
                      onChange={(e) => setInstallmentsToPay(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, remainingInstallments))))}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {!payment.is_installment && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Monto a pagar
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={amount ? Number(amount).toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/\D/g, '');
                          setAmount(numericValue);
                        }}
                        disabled={paymentType === 'full' && payment.pending_cycles > 0}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 transition-all ${
                          paymentType === 'full' && payment.pending_cycles > 0
                            ? 'bg-slate-800/30 border border-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-800/50 border border-slate-700 focus:ring-blue-500'
                        }`}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Resumen */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total a pagar:</span>
                    <span className="text-white text-xl font-bold">{formatCurrency(currentAmount)}</span>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Procesando...' : 'Pagar'}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
