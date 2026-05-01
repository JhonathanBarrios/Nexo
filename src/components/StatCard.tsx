import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  amount: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  gradient: string;
}

export function StatCard({ title, amount, change, trend, icon: Icon, gradient }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl"
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div>
          <p className="text-slate-400 text-xs md:text-sm mb-1">{title}</p>
          <h3 className="text-white text-2xl md:text-3xl font-bold">{amount}</h3>
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs md:text-sm font-medium ${
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {trend === 'up' ? '↑' : '↓'} {change}
        </span>
        <span className="text-slate-500 text-xs md:text-sm hidden sm:inline">vs mes anterior</span>
      </div>
    </motion.div>
  );
}
