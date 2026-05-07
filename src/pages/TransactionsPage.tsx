import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import {
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  MoreVertical,
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
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTransactions, type Transaction, type TransactionsFilters } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useCards } from '../hooks/useCards';
import { TransactionModal } from '../components/TransactionModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

type DateFilter = 'today' | 'this_month' | 'last_month' | 'custom';

export default function TransactionsPage() {
  const { categories } = useCategories();
  const { cards } = useCards();
  const location = useLocation();

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCard, setFilterCard] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'payment' | 'withdrawal' | 'savings'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: string }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Calcular fechas para los filtros
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'this_month':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        };
      case 'last_month':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const { startDate, endDate } = getDateRange();

  // Mapear sortOrder a sortBy y sortOrder para el hook
  const getSortConfig = () => {
    switch (sortOrder) {
      case 'newest':
        return { sortBy: 'date' as const, sortOrder: 'desc' as const };
      case 'oldest':
        return { sortBy: 'date' as const, sortOrder: 'asc' as const };
      case 'highest':
        return { sortBy: 'amount' as const, sortOrder: 'desc' as const };
      case 'lowest':
        return { sortBy: 'amount' as const, sortOrder: 'asc' as const };
      default:
        return { sortBy: 'date' as const, sortOrder: 'desc' as const };
    }
  };

  const { sortBy, sortOrder: sortDirection } = getSortConfig();

  // Construir filtros para el hook
  const filters: TransactionsFilters = {
    startDate,
    endDate,
    categoryId: filterCategory === 'all' ? undefined : categories.find(c => c.name === filterCategory)?.id,
    cardId: filterCard === 'all' ? undefined : filterCard,
    type: filterType === 'all' ? undefined : filterType,
    page,
    pageSize,
    sortBy,
    sortOrder: sortDirection,
  };

  const { transactions, refetch, deleteTransaction, totalCount, loading } = useTransactions(filters);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [dateFilter, filterCategory, filterCard, filterType, sortOrder]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

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
      message: '¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.',
    });
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingTransaction(null);
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
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all max-w-[200px] mx-auto sm:w-auto sm:mx-0 sm:max-w-none"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">Nueva Transacción</span>
            <span className="md:hidden">Nuevo</span>
          </motion.button>
        </div>

      </motion.div>

      {/* Filters */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
              <button
                onClick={() => setFilterType('payment')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterType === 'payment'
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                Pago TC
              </button>
              <button
                onClick={() => setFilterType('withdrawal')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterType === 'withdrawal'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                Retiro
              </button>
              <button
                onClick={() => setFilterType('savings')}
                className={`flex-1 py-3 rounded-xl font-medium transition-all text-sm ${
                  filterType === 'savings'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                Ahorro
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
              <option value="payment">Pago TC</option>
              <option value="withdrawal">Retiro</option>
              <option value="savings">Ahorro</option>
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Filtrar por:</span>
          </div>
          {/* Carousel de filtros para móvil */}
          <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                dateFilter === 'today'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                dateFilter === 'this_month'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setDateFilter('last_month')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                dateFilter === 'last_month'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Mes Pasado
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                dateFilter === 'custom'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Personalizado
            </button>
          </div>
          {/* Filtros de fecha personalizada fuera del carrusel */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400">a</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
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
          <button 
            onClick={() => toast('Funcionalidad en curso', { icon: '⚠️' })}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg font-semibold">
            {loading ? 'Cargando...' : `${totalCount} Transacciones`}
          </h3>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">Cargando transacciones...</p>
            </div>
          ) : (
            <AnimatePresence>
              {transactions.map((transaction, index) => {
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
                        transaction.type === 'income' ? 'text-green-400' : 
                        transaction.type === 'expense' ? 'text-red-400' :
                        transaction.type === 'payment' ? 'text-purple-400' :
                        transaction.type === 'savings' ? 'text-emerald-400' :
                        'text-white'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : transaction.type === 'expense' || transaction.type === 'payment' ? '-' : transaction.type === 'savings' ? '' : ''}
                      {formatCurrency(Math.abs(Number(transaction.amount))).replace('COP', '').trim()}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-green-500/20 text-green-400'
                          : transaction.type === 'savings'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : transaction.type === 'payment'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? 'Ingreso' : transaction.type === 'savings' ? 'Ahorro' : transaction.type === 'payment' ? 'Pago TC' : 'Gasto'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Desktop: botones individuales */}
                    <div className="hidden sm:flex items-center gap-2">
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
                    
                    {/* Mobile: menú de 3 puntos */}
                    <div className="relative sm:hidden">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === transaction.id ? null : transaction.id);
                        }}
                        className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </motion.button>
                      
                      <AnimatePresence>
                        {openMenuId === transaction.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-32 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-50"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleEdit(transaction);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-t-xl flex items-center gap-2 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDelete(transaction);
                              }}
                              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 rounded-b-xl flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          )}

          {!loading && transactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No se encontraron transacciones</p>
              <p className="text-slate-500 text-sm mt-2">
                Intenta ajustar los filtros o agrega una nueva transacción
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalCount > pageSize && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <span className="text-slate-400 text-sm">
                Página {page} de {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
