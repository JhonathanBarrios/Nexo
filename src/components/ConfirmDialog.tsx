import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

const typeConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'from-red-500 to-rose-600',
    confirmBg: 'from-red-500 to-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'from-amber-500 to-orange-600',
    confirmBg: 'from-amber-500 to-orange-600',
  },
  info: {
    icon: AlertTriangle,
    iconBg: 'from-blue-500 to-cyan-600',
    confirmBg: 'from-blue-500 to-cyan-600',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
}: ConfirmDialogProps) {
  const config = typeConfig[type]
  const Icon = config.icon

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
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${config.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm">{message}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-medium hover:bg-slate-800 transition-all"
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className={`flex-1 px-4 py-3 bg-gradient-to-r ${config.confirmBg} text-white rounded-xl font-medium shadow-lg transition-all`}
                >
                  {confirmText}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}