import { StatCard } from '../components/StatCard';
import { ExpenseChart } from '../components/ExpenseChart';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { RecentTransactions } from '../components/RecentTransactions';
import { TransactionModal } from '../components/TransactionModal';
import { PaymentAlerts } from '../components/PaymentAlerts';
import { UpcomingPayments } from '../components/UpcomingPayments';
import { TrendingUp, TrendingDown, Wallet, Plus, Calendar, PiggyBank, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { useTransactions } from '../hooks/useTransactions';
import { useSavingsAccounts } from '../hooks/useSavingsAccounts';
import { useState } from 'react';
import { Fragment } from 'react';
import { formatCurrency } from '../utils/currency';

type DateFilter = 'today' | 'this_month' | 'last_month' | 'custom';

export default function DashboardPage() {
  const { transactions, loading, refetch } = useTransactions();
  const { getTotalSavings } = useSavingsAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calcular el rango de la quincena actual (fijo: 1-15, 16-fin de mes)
  const getCurrentBudgetCycle = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let startDate: Date;
    let endDate: Date;

    if (currentDay <= 15) {
      // Primera quincena: 1-15
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth, 15);
    } else {
      // Segunda quincena: 16-fin de mes
      startDate = new Date(currentYear, currentMonth, 16);
      endDate = new Date(currentYear, currentMonth + 1, 0); // Último día del mes
    }

    return { start: startDate, end: endDate };
  };

  // Filter transactions by date
  const filterTransactionsByDate = (txs: typeof transactions) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const budgetCycle = getCurrentBudgetCycle();
    
    return txs.filter(t => {
      const transactionDate = new Date(t.date + 'T00:00:00');
      
      switch (dateFilter) {
        case 'today':
          return transactionDate.toDateString() === today.toDateString();
        case 'this_month':
          // Usar el ciclo de presupuesto personalizado
          return transactionDate >= budgetCycle.start && transactionDate <= budgetCycle.end;
        case 'last_month':
          // Ciclo anterior: restar 1 mes al inicio del ciclo actual
          const lastMonthStart = new Date(budgetCycle.start);
          lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
          const lastMonthEnd = new Date(budgetCycle.start);
          lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
          return transactionDate >= lastMonthStart && transactionDate <= lastMonthEnd;
        case 'custom':
          if (!customStartDate || !customEndDate) return false;
          const start = new Date(customStartDate + 'T00:00:00');
          const end = new Date(customEndDate + 'T23:59:59');
          return transactionDate >= start && transactionDate <= end;
        default:
          return true;
      }
    });
  };

  const filteredTransactions = filterTransactionsByDate(transactions);

  // Calcular estadísticas
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalCardPayments = filteredTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses - totalCardPayments;

  const recentTransactions = filteredTransactions.slice(0, 5);

  return (
    <Fragment>
      <div className="p-4 md:p-8">
          {/* Payment Alerts */}
          <PaymentAlerts />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">Dashboard Financiero</h1>
              <p className="text-slate-400 text-sm md:text-base">
                {loading ? 'Cargando...' : 'Resumen de tus finanzas personales'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Nueva Transacción</span>
                <span className="md:hidden">Nueva Transacción</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Date Filters */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8 bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-800/50"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Filtrar por:</span>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    dateFilter === 'today'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setDateFilter('this_month')}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    dateFilter === 'this_month'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Este Mes
                </button>
                <button
                  onClick={() => setDateFilter('last_month')}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    dateFilter === 'last_month'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Mes Pasado
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    dateFilter === 'custom'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Personalizado
                </button>
              </div>
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400">a</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
            <StatCard
              title="Balance Total"
              amount={formatCurrency(balance)}
              change="0%"
              trend="up"
              icon={Wallet}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              title="Ingresos"
              amount={formatCurrency(totalIncome)}
              change="0%"
              trend="up"
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-green-500 to-green-600"
            />
            <StatCard
              title="Gastos"
              amount={formatCurrency(totalExpenses)}
              change="0%"
              trend="down"
              icon={TrendingDown}
              gradient="bg-gradient-to-br from-red-500 to-red-600"
            />
            <StatCard
              title="Pagos TC"
              amount={formatCurrency(totalCardPayments)}
              change="0%"
              trend="down"
              icon={CreditCard}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            />
            <StatCard
              title="Ahorro Total"
              amount={formatCurrency(getTotalSavings())}
              change="0%"
              trend="up"
              icon={PiggyBank}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <div>
              <ExpenseChart transactions={filteredTransactions} />
            </div>
            <div>
              <CategoryBreakdown transactions={filteredTransactions} />
            </div>
          </div>

          {/* Recent Transactions and Upcoming Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <RecentTransactions transactions={recentTransactions} loading={loading} />
            <UpcomingPayments />
          </div>
        </div>

        <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refetch} />
    </Fragment>
  );
}
