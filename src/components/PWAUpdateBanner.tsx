import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';

interface PWAUpdateBannerProps {
  onReload: () => void;
  onClose: () => void;
}

export default function PWAUpdateBanner({ onReload, onClose }: PWAUpdateBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 shadow-2xl border border-white/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm sm:text-base">
                  Nueva versión disponible
                </p>
                <p className="text-white/80 text-xs sm:text-sm">
                  Actualiza para obtener las últimas mejoras
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReload}
                className="px-4 py-2 bg-white text-blue-600 rounded-xl font-medium text-sm sm:text-base hover:bg-white/90 transition-colors"
              >
                Actualizar
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
