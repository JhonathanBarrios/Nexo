import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, Clock, X } from 'lucide-react'
import { useRecurringPayments } from '../hooks/useRecurringPayments'
import { formatCurrency } from '../utils/currency'

export function PaymentAlerts() {
  const { getPaymentAlerts } = useRecurringPayments()
  const alerts = getPaymentAlerts()
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const dismissAlert = (id: string) => {
    setDismissedAlerts(new Set([...dismissedAlerts, id]))
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  if (visibleAlerts.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl border shadow-lg ${
              alert.status === 'overdue'
                ? 'bg-red-500/20 border-red-500/50'
                : 'bg-amber-500/20 border-amber-500/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                alert.status === 'overdue'
                  ? 'bg-red-500/30'
                  : 'bg-amber-500/30'
              }`}>
                {alert.status === 'overdue' ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-sm font-medium ${
                    alert.status === 'overdue' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {alert.status === 'overdue' ? 'Pago Vencido' : 'Pago Próximo'}
                  </p>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-white font-medium">{alert.payment.description}</p>
                <p className={`text-sm ${
                  alert.status === 'overdue' ? 'text-red-300' : 'text-amber-300'
                }`}>
                  {formatCurrency(alert.payment.amount).replace('COP', '').trim()} • {alert.daysUntilDue === 0 ? 'Hoy' : alert.daysUntilDue === 1 ? 'Mañana' : `En ${alert.daysUntilDue} días`}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
