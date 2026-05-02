import { motion } from 'motion/react';
import { Repeat, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecurringPayments } from '../hooks/useRecurringPayments';
import { formatCurrency } from '../utils/currency';

export function UpcomingPayments() {
  const navigate = useNavigate();
  const { payments } = useRecurringPayments();
  
  // Filtrar pagos activos y ordenar por próxima fecha
  const upcomingPayments = payments
    .filter(p => p.is_active)
    .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())
    .slice(0, 5);

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-lg font-semibold">Próximos Pagos Programados</h3>
        <button
          onClick={() => navigate('/recurring-payments')}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          Ver todos
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {upcomingPayments.length === 0 ? (
          <div className="text-center py-8">
            <Repeat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay pagos programados</p>
          </div>
        ) : (
          upcomingPayments.map((payment, index) => {
            const daysUntilDue = getDaysUntilDue(payment.next_due_date);
            const isOverdue = daysUntilDue < 0;
            const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 3;
            
            return (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                onClick={() => navigate('/recurring-payments')}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isOverdue
                      ? 'bg-red-500/20'
                      : isUrgent
                      ? 'bg-amber-500/20'
                      : 'bg-purple-500/20'
                  }`}
                >
                  <Repeat className={`w-5 h-5 ${
                    isOverdue
                      ? 'text-red-400'
                      : isUrgent
                      ? 'text-amber-400'
                      : 'text-purple-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{payment.description}</p>
                  <p className="text-slate-400 text-sm">
                    {payment.frequency === 'monthly' ? 'Mensual' :
                     payment.frequency === 'weekly' ? 'Semanal' :
                     payment.frequency === 'daily' ? 'Diario' :
                     payment.frequency === 'yearly' ? 'Anual' : 'Personalizado'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-bold">{formatCurrency(payment.amount || 0).replace('COP', '').trim()}</p>
                  <p className={`text-xs ${
                    isOverdue
                      ? 'text-red-400'
                      : isUrgent
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}>
                    {isOverdue
                      ? `Vencido hace ${Math.abs(daysUntilDue)} días`
                      : daysUntilDue === 0
                      ? 'Hoy'
                      : daysUntilDue === 1
                      ? 'Mañana'
                      : `En ${daysUntilDue} días`}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}