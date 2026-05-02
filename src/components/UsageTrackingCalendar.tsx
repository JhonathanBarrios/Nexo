import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { useRecurringPayments } from '../hooks/useRecurringPayments';
import { formatCurrency } from '../utils/currency';

interface UsageTrackingCalendarProps {
  paymentId: string;
  startDate: string;
  endDate: string;
  userId: string;
  onTrackingChange?: (totalAmount: number) => void;
}

export default function UsageTrackingCalendar({
  paymentId,
  startDate,
  endDate,
  userId,
  onTrackingChange,
}: UsageTrackingCalendarProps) {
  const { fetchServiceUsageTracking, upsertServiceUsageTracking, deleteServiceUsageTracking } = useRecurringPayments();
  const [trackedDays, setTrackedDays] = useState<Map<string, { amount: number; notes: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayAmount, setDayAmount] = useState('');
  const [dayNotes, setDayNotes] = useState('');

  // Generate date range
  const getDateRange = (start: string, end: string) => {
    const dates: Date[] = [];
    const current = new Date(start);
    const last = new Date(end);
    
    while (current <= last) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const dates = getDateRange(startDate, endDate);
  const totalAmount = Array.from(trackedDays.values()).reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    onTrackingChange?.(totalAmount);
  }, [totalAmount, onTrackingChange]);

  useEffect(() => {
    // Fetch existing tracking data
    const fetchTrackingData = async () => {
      try {
        const data = await fetchServiceUsageTracking(paymentId, startDate, endDate);
        const daysMap = new Map<string, { amount: number; notes: string | null }>();
        data.forEach((item) => {
          daysMap.set(item.date, { amount: item.amount, notes: item.notes });
        });
        setTrackedDays(daysMap);
      } catch (error) {
        console.error('Error fetching tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingData();
  }, [paymentId, startDate, endDate, fetchServiceUsageTracking]);

  const handleDayClick = async (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    
    if (trackedDays.has(dateString)) {
      // If already tracked, delete it
      try {
        const data = await fetchServiceUsageTracking(paymentId, dateString, dateString);
        if (data && data.length > 0) {
          await deleteServiceUsageTracking(data[0].id, paymentId);
          const newMap = new Map(trackedDays);
          newMap.delete(dateString);
          setTrackedDays(newMap);
        }
      } catch (error) {
        console.error('Error deleting tracking:', error);
      }
    } else {
      // If not tracked, open modal to enter amount
      setSelectedDate(dateString);
      setDayAmount('');
      setDayNotes('');
      setShowDayModal(true);
    }
  };

  const handleDayModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !dayAmount || !userId) return;

    try {
      const amount = parseFloat(dayAmount);
      await upsertServiceUsageTracking(paymentId, selectedDate, amount, userId, dayNotes || undefined);
      
      const newMap = new Map(trackedDays);
      newMap.set(selectedDate, { amount, notes: dayNotes || null });
      setTrackedDays(newMap);
      
      setShowDayModal(false);
      setSelectedDate(null);
      setDayAmount('');
      setDayNotes('');
    } catch (error) {
      console.error('Error adding tracking:', error);
    }
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  };

  const getDayNumber = (date: Date) => {
    return date.getDate();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-white text-lg font-semibold">Tracking de Uso</h3>
        </div>
        <div className="bg-blue-500/20 rounded-xl px-4 py-2 border border-blue-500/30">
          <p className="text-blue-400 text-sm font-medium">
            Total: {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const dateString = date.toISOString().split('T')[0];
          const isTracked = trackedDays.has(dateString);
          const trackingData = trackedDays.get(dateString);
          const isWeekendDay = isWeekend(date);
          
          return (
            <motion.button
              key={dateString}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDayClick(date)}
              disabled={isWeekendDay}
              className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center p-2
                transition-all cursor-pointer
                ${isTracked
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : isWeekendDay
                  ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                }
              `}
              title={isWeekendDay ? 'Fin de semana' : isTracked ? `${formatCurrency(trackingData?.amount || 0)} - ${trackingData?.notes || 'Sin nota'}` : 'Click para agregar valor'}
            >
              <span className="text-xs font-medium">{getDayName(date)}</span>
              <span className="text-lg font-bold">{getDayNumber(date)}</span>
              {isTracked && (
                <span className="text-xs font-medium mt-1">
                  {formatCurrency(trackingData?.amount || 0).replace('COP', '').trim()}
                </span>
              )}
              {isTracked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-purple-600"></div>
          <span>Marcado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-800/50"></div>
          <span>Sin marcar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-800/30"></div>
          <span>Fin de semana</span>
        </div>
      </div>

      {/* Modal para ingresar valor del día */}
      <AnimatePresence>
        {showDayModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDayModal(false)}
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
                  <h3 className="text-white text-xl font-semibold">
                    Valor para {selectedDate}
                  </h3>
                  <button onClick={() => setShowDayModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleDayModalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Valor</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="text"
                        value={dayAmount ? Number(dayAmount).toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/\D/g, '');
                          setDayAmount(numericValue);
                        }}
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nota (opcional)</label>
                    <input
                      type="text"
                      value={dayNotes}
                      onChange={(e) => setDayNotes(e.target.value)}
                      placeholder="Ej: Viaje extra"
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
                  >
                    Guardar
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
