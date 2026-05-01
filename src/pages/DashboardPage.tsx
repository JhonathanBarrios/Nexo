import { StatCard } from '../components/StatCard';
import { ExpenseChart } from '../components/ExpenseChart';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { RecentTransactions } from '../components/RecentTransactions';
import { TransactionModal } from '../components/TransactionModal';
import { PaymentAlerts } from '../components/PaymentAlerts';
import { UpcomingPayments } from '../components/UpcomingPayments';
import { TrendingUp, TrendingDown, Wallet, DollarSign, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useTransactions } from '../hooks/useTransactions';
import { useState } from 'react';
import { Fragment } from 'react';
import { formatCurrency } from '../utils/currency';

export default function DashboardPage() {
  const { transactions, loading, refetch } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calcular estadísticas
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpenses;
  const savings = totalIncome - totalExpenses;

  const recentTransactions = transactions.slice(0, 5);

  return (
    <Fragment>
      <div className="p-4 md:p-8">
          {/* Payment Alerts */}
          <PaymentAlerts />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8 flex items-center justify-between gap-4"
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
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Nueva Transacción
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
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
              title="Ahorros"
              amount={formatCurrency(savings)}
              change="0%"
              trend="up"
              icon={DollarSign}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <div>
              <ExpenseChart transactions={transactions} />
            </div>
            <div>
              <CategoryBreakdown transactions={transactions} />
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
