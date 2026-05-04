import { motion } from 'motion/react';
import { ShoppingBag, Car, Home, Coffee, Heart, Smartphone, DollarSign, MoreHorizontal, ChevronRight, Utensils, Film, BookOpen, Briefcase, GraduationCap, Zap, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useCards } from '../hooks/useCards';
import { formatCurrency } from '../utils/currency';

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
  title?: string;
  filterCardId?: string;
}

export function RecentTransactions({ transactions: txs, loading, title = 'Transacciones Recientes', filterCardId }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { cards } = useCards();

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
    // Use the icon from the category directly (Lucide icon name)
    const getIconComponent = (iconName: string) => {
      const icons: any = {
        Utensils, Car, Home, Coffee, Heart, Smartphone, Film, BookOpen, ShoppingBag, DollarSign, Briefcase, GraduationCap, Zap,
      };
      return icons[iconName] || MoreHorizontal;
    };
    return {
      name: category.name,
      icon: getIconComponent(category.icon),
      color: category.color || 'from-gray-500 to-gray-600',
    };
  };

  const getCardInfo = (cardId: string | null) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return null;
    return {
      name: card.name,
      lastFour: card.last_four,
      color: card.color,
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
          <h3 className="text-white text-base md:text-lg font-semibold">{title}</h3>
          <button 
            onClick={() => navigate('/transactions', filterCardId ? { state: { filterCardId } } : undefined)}
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
        <h3 className="text-white text-base md:text-lg font-semibold">{title}</h3>
        <button 
          onClick={() => navigate('/transactions', filterCardId ? { state: { filterCardId } } : undefined)}
          className="text-blue-400 hover:text-blue-300 text-xs md:text-sm font-medium flex items-center gap-1 transition-colors"
        >
          Ver todas
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 md:space-y-3">
        {recentTransactions.map((transaction, index) => {
          const categoryInfo = getCategoryInfo(transaction.category_id);
          const cardInfo = getCardInfo(transaction.card_id);
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
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 text-xs md:text-sm">{categoryInfo.name}</p>
                  {cardInfo && (
                    <>
                      <span className="text-slate-600">•</span>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <CreditCard className="w-3 h-3" />
                        <span>{cardInfo.name} •••• {cardInfo.lastFour}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`font-semibold text-sm md:text-base ${
                    transaction.type === 'income' ? 'text-green-400' : 
                    transaction.type === 'expense' ? 'text-red-400' :
                    transaction.type === 'payment' ? 'text-purple-400' :
                    'text-white'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : transaction.type === 'expense' || transaction.type === 'payment' ? '-' : ''}{formatCurrency(Number(transaction.amount)).replace('COP', '').trim()}
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
