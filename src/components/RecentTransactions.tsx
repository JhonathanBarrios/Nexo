import { motion } from 'motion/react';
import { ShoppingBag, Car, Home, Coffee, Heart, Smartphone, DollarSign, MoreHorizontal, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency } from '../utils/currency';

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
}

const categoryIcons: Record<string, any> = {
  'Alimentación': ShoppingBag,
  'Transporte': Car,
  'Vivienda': Home,
  'Entretenimiento': Coffee,
  'Salud': Heart,
  'Educación': Smartphone,
  'Compras': Smartphone,
  'Otros': MoreHorizontal,
  'Ingreso': DollarSign,
};

const categoryColors: Record<string, string> = {
  'Alimentación': 'from-blue-500 to-blue-600',
  'Transporte': 'from-purple-500 to-purple-600',
  'Vivienda': 'from-pink-500 to-pink-600',
  'Entretenimiento': 'from-amber-500 to-amber-600',
  'Salud': 'from-red-500 to-red-600',
  'Educación': 'from-cyan-500 to-cyan-600',
  'Compras': 'from-indigo-500 to-indigo-600',
  'Otros': 'from-gray-500 to-gray-600',
  'Ingreso': 'from-green-500 to-green-600',
};

export function RecentTransactions({ transactions: txs, loading }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const { categories } = useCategories();

  const recentTransactions = txs.slice(0, 5);

  const getCategoryInfo = (categoryId: string | null) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return {
        name: 'Sin categoría',
        icon: MoreHorizontal,
        color: 'from-gray-500 to-gray-600',
      };
    }
    return {
      name: category.name,
      icon: categoryIcons[category.name] || MoreHorizontal,
      color: categoryColors[category.name] || 'from-gray-500 to-gray-600',
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
        <div className="flex items-center justify-center h-48 text-slate-400">
          Cargando transacciones...
        </div>
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h3 className="text-white text-base md:text-lg font-semibold">Transacciones Recientes</h3>
          <button 
            onClick={() => navigate('/transactions')}
            className="text-blue-400 hover:text-blue-300 text-xs md:text-sm font-medium flex items-center gap-1 transition-colors"
          >
            Ver todas
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center h-48 text-slate-400">
          No hay transacciones registradas
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h3 className="text-white text-base md:text-lg font-semibold">Transacciones Recientes</h3>
        <button 
          onClick={() => navigate('/transactions')}
          className="text-blue-400 hover:text-blue-300 text-xs md:text-sm font-medium flex items-center gap-1 transition-colors"
        >
          Ver todas
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 md:space-y-3">
        {recentTransactions.map((transaction, index) => {
          const categoryInfo = getCategoryInfo(transaction.category_id);
          const Icon = categoryInfo.icon;
          return (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all cursor-pointer group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${categoryInfo.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm md:text-base truncate">{transaction.description}</p>
                <p className="text-slate-400 text-xs md:text-sm">{categoryInfo.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`font-semibold text-sm md:text-base ${
                    transaction.type === 'income' ? 'text-green-400' : 'text-white'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : ''}{formatCurrency(Number(transaction.amount)).replace('COP', '').trim()}
                </p>
                <p className="text-slate-400 text-xs md:text-sm">{formatDate(transaction.date)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
