import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

export function NotificationBanner() {
  const { notification } = useRealtimeNotifications();

  if (!notification) return null;

  const { threshold, percentage, spent, budget } = notification.payload;

  const getAlertConfig = () => {
    switch (threshold) {
      case 50:
        return {
          color: 'from-yellow-500 to-orange-500',
          icon: AlertTriangle,
          title: 'Alerta de Presupuesto - 50%',
          message: `Has gastado el ${percentage.toFixed(0)}% de tu presupuesto ($${spent.toFixed(2)} de $${budget.toFixed(2)})`,
        };
      case 80:
        return {
          color: 'from-orange-500 to-red-500',
          icon: AlertTriangle,
          title: 'Alerta de Presupuesto - 80%',
          message: `Estás cerca del límite: ${percentage.toFixed(0)}% gastado ($${spent.toFixed(2)} de $${budget.toFixed(2)})`,
        };
      case 100:
        return {
          color: 'from-red-500 to-red-600',
          icon: X,
          title: '¡Presupuesto Excedido!',
          message: `Has excedido tu presupuesto: ${percentage.toFixed(0)}% gastado ($${spent.toFixed(2)} de $${budget.toFixed(2)})`,
        };
      default:
        return {
          color: 'from-blue-500 to-blue-600',
          icon: Info,
          title: 'Alerta de Presupuesto',
          message: `Has gastado el ${percentage.toFixed(0)}% de tu presupuesto`,
        };
    }
  };

  const config = getAlertConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 max-w-md"
      >
        <div className={`bg-gradient-to-r ${config.color} rounded-2xl shadow-2xl p-4 text-white`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm md:text-base">{config.title}</h3>
              <p className="text-xs md:text-sm opacity-90 mt-1">{config.message}</p>
            </div>
            <button
              onClick={() => {/* TODO: dismiss notification */}}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
