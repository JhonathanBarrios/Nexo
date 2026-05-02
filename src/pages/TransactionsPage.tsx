import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  DollarSign,
  Utensils,
  Car,
  Home,
  Coffee,
  Heart,
  Smartphone,
  Film,
  BookOpen,
  ShoppingBag,
  CreditCard,
} from 'lucide-react';
import { useTransactions, type Transaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useCards } from '../hooks/useCards';
import { TransactionModal } from '../components/TransactionModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const { transactions, refetch, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { cards } = useCards();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCard, setFilterCard] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  });

  // Manejar filtro por tarjeta desde navegación
  useEffect(() => {
    if (location.state?.filterCardId) {
      setFilterCard(location.state.filterCardId);
    }
  }, [location.state]);

  const categoryOptions = ['all', ...categories.map(c => c.name)];

  const getIconComponent = (iconName: string) => {
    const icons: any = {
      Utensils, Car, Home, Coffee, Heart, Smartphone, Film, BookOpen, ShoppingBag, DollarSign,
    };
    return icons[iconName] || DollarSign;
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

  const filteredTransactions = transactions
    .filter((t) => {
      const category = categories.find(c => c.id === t.category_id);
      const categoryName = category?.name || 'Sin categoría';
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || categoryName === filterCategory;
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesCard = filterCard === 'all' || t.card_id === filterCard;
      
      const transactionDate = new Date(t.date);
      const matchesStartDate = !filterStartDate || transactionDate >= new Date(filterStartDate);
      const matchesEndDate = !filterEndDate || transactionDate <= new Date(filterEndDate);
      
      return matchesSearch && matchesCategory && matchesType && matchesCard && matchesStartDate && matchesEndDate;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'highest':
          return Math.abs(Number(b.amount)) - Math.abs(Number(a.amount));
        case 'lowest':
          return Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
        default:
          return 0;
      }
    });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setConfirmDialog({
      isOpen: true,
      onConfirm: async () => {
        await deleteTransaction(transaction.id);
        toast.success('Transacción eliminada correctamente');
        refetch();
      },
      title: 'Eliminar Transacción',
      message: `¿Estás seguro de eliminar la transacción "${transaction.description}"? Esta acción no se puede deshacer.`,
    });
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    refetch();
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">Transacciones</h1>
            <p className="text-slate-400 text-sm lg:text-base">
              Gestiona y visualiza todas tus transacciones
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nueva Transacción</span>
            <span className="sm:hidden">Nueva</span>
          </motion.button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50"
          >
            <p className="text-slate-400 text-sm mb-1">Total Ingresos</p>
            <p className="text-green-400 text-xl md:text-2xl font-bold">{formatCurrency(totalIncome)}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50"
          >
            <p className="text-slate-400 text-sm mb-1">Total Gastos</p>
            <p className="text-red-400 text-xl md:text-2xl font-bold">{formatCurrency(totalExpense)}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50"
          >
            <p className="text-slate-400 text-sm mb-1">Balance Neto</p>
            <p className={`text-xl md:text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar transacciones..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Card Filter */}
          <div>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select
                value={filterCard}
                onChange={(e) => setFilterCard(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="all">Todas las tarjetas</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} (•••• {card.last_four})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Todas las categorías' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterType === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterType === 'income'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterType === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                Gastos
              </button>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="sm:hidden w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todas</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Sort and Export */}
        <div className="flex flex-row sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ArrowUpDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguas</option>
              <option value="highest">Mayor monto</option>
              <option value="lowest">Menor monto</option>
            </select>
          </div>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <Download className="w-5 h-5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg font-semibold">
            {filteredTransactions.length} Transacciones
          </h3>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredTransactions.map((transaction, index) => {
              const category = categories.find(c => c.id === transaction.category_id);
              const Icon = getIconComponent(category?.icon || 'DollarSign');
              const color = category?.color || 'from-slate-500 to-slate-600';
              const categoryName = category?.name || 'Sin categoría';
              const cardInfo = getCardInfo(transaction.card_id);
              
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all cursor-pointer group"
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-slate-400 text-sm truncate">{categoryName}</span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="text-slate-400 text-sm hidden sm:inline">{transaction.date}</span>
                      {cardInfo && (
                        <>
                          <span className="text-slate-600">•</span>
                          <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <CreditCard className="w-3 h-3" />
                            <span>{cardInfo.name} •••• {cardInfo.lastFour}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-lg lg:text-xl font-bold ${
                        transaction.type === 'income' ? 'text-green-400' : 'text-white'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(Number(transaction.amount))).replace('COP', '').trim()}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(transaction);
                      }}
                      className="p-2 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-blue-400" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(transaction);
                      }}
                      className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No se encontraron transacciones</p>
              <p className="text-slate-500 text-sm mt-2">
                Intenta ajustar los filtros o agrega una nueva transacción
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal 
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingTransaction={editingTransaction}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
      />
    </div>
  );
}
