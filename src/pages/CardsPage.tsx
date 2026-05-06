import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, CreditCard, Edit2, Trash2, BarChart3, Wallet } from 'lucide-react';
import { useCards } from '../hooks/useCards';
import { useTransactions, type TransactionsFilters } from '../hooks/useTransactions';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import CardModal from '../components/CardModal';
import { TransactionModal } from '../components/TransactionModal';
import { RecentTransactions } from '../components/RecentTransactions';
import { formatCurrency } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import EmptyCards from '../components/EmptyCards';

export default function CardsPage() {
  const { cards, loading, createCard, updateCard, deleteCard, updateCardBalance } = useCards();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [prefilledCardId, setPrefilledCardId] = useState('');
  const [prefilledType, setPrefilledType] = useState<'income' | 'expense' | 'payment' | 'withdrawal'>('expense');

  // Filtros dinámicos para cargar solo transacciones de la tarjeta seleccionada
  const cardTransactionsFilters: TransactionsFilters = {
    cardId: cards[cardIndex]?.id, // Filtrar por tarjeta seleccionada
    page: 1,
    pageSize: 5, // Solo las 5 más recientes
    sortBy: 'date',
    sortOrder: 'desc',
  };
  const { transactions, refetch: refetchTransactions } = useTransactions(cardTransactionsFilters);

  // Filtros para gráficos (todas las transacciones de todas las tarjetas, este mes)
  const now = new Date();
  const chartFilters: TransactionsFilters = {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    page: 1,
    pageSize: 1000, // Límite alto para gráficos
    sortBy: 'date',
    sortOrder: 'desc',
  };
  const { transactions: allTransactions } = useTransactions(chartFilters);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50) {
      setCardIndex((prev) => (prev + 1) % cards.length);
    } else if (info.offset.x > 50) {
      setCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }
  };

  const handleCreateCard = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleDeleteCard = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarjeta?')) {
      try {
        await deleteCard(id);
        toast.success('Tarjeta eliminada correctamente');
      } catch (error: any) {
        toast.error('Error al eliminar tarjeta: ' + error.message);
      }
    }
  };

  const handleViewCardTransactions = (card: any) => {
    navigate('/transactions', { state: { filterCardId: card.id } });
  };

  const handleCreateTransaction = (card: any) => {
    setPrefilledCardId(card.id);
    setPrefilledType(card.type === 'credit' ? 'payment' : 'expense');
    setShowTransactionModal(true);
  };

  const handleTransactionSuccess = (transaction: any) => {
    setShowTransactionModal(false);
    // Actualizar balance localmente sin refetch
    if (transaction.card_id) {
      updateCardBalance(transaction.card_id, transaction);
    }
    // Refetch transacciones para actualizar gráficas
    refetchTransactions();
  };

  const handleSaveCard = async (cardData: any) => {
    try {
      if (editingCard) {
        await updateCard(editingCard.id, cardData);
        toast.success('Tarjeta actualizada correctamente');
      } else {
        await createCard(cardData);
        toast.success('Tarjeta creada correctamente');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error('Error al guardar tarjeta: ' + error.message);
    }
  };

  const getCardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Crédito',
      debit: 'Débito',
      cash: 'Efectivo',
    };
    return labels[type] || type;
  };

  const calculateCardStats = (cardId: string) => {
    const cardTransactions = allTransactions.filter(t => t.card_id === cardId && t.type === 'expense');
    const totalSpent = cardTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const transactionCount = cardTransactions.length;
    
    // Calcular gastos del mes actual
    const now = new Date();
    const currentMonthTransactions = cardTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const monthlySpent = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalSpent,
      transactionCount,
      monthlySpent,
    };
  };

  // Preparar datos para gráficos
  const prepareChartData = () => {
    const barData = cards.map(card => {
      const stats = calculateCardStats(card.id);
      return {
        name: card.name.substring(0, 10) + (card.name.length > 10 ? '...' : ''),
        fullName: card.name,
        monthly: stats.monthlySpent,
        total: stats.totalSpent,
        color: card.color,
      };
    });

    const pieData = cards.map(card => {
      const stats = calculateCardStats(card.id);
      return {
        name: card.name,
        value: stats.monthlySpent,
        color: card.color,
      };
    }).filter(item => item.value > 0);

    return { barData, pieData };
  };

  const chartData = prepareChartData();

  if (!user) return null;

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">Mis Tarjetas</h1>
            <p className="text-slate-400">Gestiona tus tarjetas de crédito y débito</p>
          </div>
          <button
            onClick={handleCreateCard}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nueva Tarjeta
          </button>
        </div>
      </motion.div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando tarjetas...</div>
      ) : cards.length === 0 ? (
        <EmptyCards onCreateCard={handleCreateCard} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Cards + Details */}
            <div className="flex flex-col items-center">
              {/* Wallet Stack Carousel */}
              <div className="relative w-[320px] h-[220px] md:w-[380px] md:h-[240px]">
                {cards.map((card, i) => {
                  const position = (i - cardIndex + cards.length) % cards.length;
                  if (position > 2) return null;

                  return (
                    <motion.div
                      key={card.id}
                      drag={position === 0 ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      dragMomentum={true}
                      onDragEnd={handleDragEnd}
                      className="absolute w-full h-full rounded-2xl p-6 text-white shadow-2xl overflow-hidden"
                      style={{
                        backgroundColor: card.color,
                        zIndex: 10 - position,
                        cursor: position === 0 ? 'grab' : 'default',
                      }}
                      animate={{
                        scale: 1 - position * 0.07,
                        y: position * 18,
                        filter: position === 0 ? "blur(0px)" : "blur(3px)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 25,
                      }}
                    >
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                      </div>

                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <span className="font-bold text-lg">{card.name}</span>
                          <p className="text-white/60 text-xs mt-1">
                            {card.type === 'cash' ? 'Efectivo' : card.bank}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          {card.type === 'cash' ? (
                            <Wallet className="w-5 h-5" />
                          ) : (
                            <CreditCard className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      {card.type !== 'cash' && (
                        <div className="absolute top-10 left-6 w-12 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md shadow-md relative z-10">
                          <div className="w-full h-full border border-yellow-600/30 rounded-md p-1">
                            <div className="w-full h-full border border-yellow-600/30 rounded-sm"></div>
                          </div>
                        </div>
                      )}

                      {card.type === 'cash' && (
                        <div className="absolute top-10 left-6 w-12 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md shadow-md relative z-10">
                          <div className="w-full h-full border border-yellow-600/30 rounded-md p-1">
                            <div className="w-full h-full border border-yellow-600/30 rounded-sm"></div>
                          </div>
                        </div>
                      )}

                      {card.type !== 'cash' ? (
                        <div className="mt-10 text-lg md:text-xl tracking-widest font-mono relative z-10">
                          {card.last_four.padStart(16, '•').replace(/(.{4})/g, '$1 ').trim()}
                        </div>
                      ) : null}

                      <div className={card.type === 'cash' ? 'mt-20 relative z-10' : 'mt-2 relative z-10'}>
                        {card.type === 'credit' ? (
                          <div>
                            <p className="text-white/60 text-[10px] uppercase tracking-wider">Deuda Actual</p>
                            <p className="text-lg md:text-xl font-bold">{formatCurrency(card.current_debt)}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-white/60 text-[10px] uppercase tracking-wider">Saldo Actual</p>
                            <p className="text-lg md:text-xl font-bold">{formatCurrency(card.current_balance)}</p>
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <span className="text-white/80 text-[10px] font-medium uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {getCardTypeLabel(card.type)}
                        </span>
                      </div>

                      <div className="absolute bottom-4 right-4">
                        {card.payment_date && card.type === 'credit' && (
                          <span className="text-white/80 text-[10px] font-medium uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            Pago: {card.payment_date}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Indicadores */}
              <div className="flex gap-2 mt-6">
                {cards.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      i === cardIndex ? 'bg-white w-6' : 'bg-slate-600'
                    }`}
                    onClick={() => setCardIndex(i)}
                  />
                ))}
              </div>

              {/* Selected Card Details Panel */}
              <div className="w-full max-w-md mt-8">
                {(() => {
                  const stats = calculateCardStats(cards[cardIndex].id);
                  const usagePercentage = cards[cardIndex].type === 'credit' && cards[cardIndex].credit_limit
                    ? (cards[cardIndex].current_debt / Number(cards[cardIndex].credit_limit)) * 100
                    : 0;

                  return (
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-semibold text-lg md:text-xl">{cards[cardIndex].name}</h3>
                          <p className="text-slate-400 text-sm md:text-base">{cards[cardIndex].bank}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleCreateTransaction(cards[cardIndex])} className="p-2 hover:bg-green-500/20 rounded-lg transition-colors">
                            <Plus className="w-4 h-4 text-green-400" />
                          </button>
                          <button onClick={() => handleEditCard(cards[cardIndex])} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4 text-slate-400" />
                          </button>
                          <button onClick={() => handleDeleteCard(cards[cardIndex].id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                          <button onClick={() => handleViewCardTransactions(cards[cardIndex])} className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors">
                            <CreditCard className="w-4 h-4 text-blue-400" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-slate-800/50 rounded-xl">
                          <p className="text-slate-400 text-xs md:text-sm mb-1">Este mes</p>
                          <p className="text-white font-semibold text-base md:text-lg">{formatCurrency(stats.monthlySpent).replace('COP', '').trim()}</p>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-xl">
                          <p className="text-slate-400 text-xs md:text-sm mb-1">Total</p>
                          <p className="text-white font-semibold text-base md:text-lg">{formatCurrency(stats.totalSpent).replace('COP', '').trim()}</p>
                        </div>
                        <div className="text-center p-3 bg-slate-800/50 rounded-xl">
                          <p className="text-slate-400 text-xs md:text-sm mb-1">Transacciones</p>
                          <p className="text-white font-semibold text-base md:text-lg">{stats.transactionCount}</p>
                        </div>
                      </div>

                      {cards[cardIndex].type === 'credit' && cards[cardIndex].credit_limit && (
                        <div className="bg-slate-800/50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-slate-400 text-sm">Uso del límite</p>
                              <p className="text-white font-medium">{formatCurrency(Number(cards[cardIndex].credit_limit)).replace('COP', '').trim()}</p>
                            </div>
                            <span className={`text-2xl font-bold ${usagePercentage > 80 ? 'text-red-400' : usagePercentage > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {usagePercentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-3">
                            <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(usagePercentage, 100)}%`, backgroundColor: usagePercentage > 80 ? '#ef4444' : usagePercentage > 50 ? '#f59e0b' : cards[cardIndex].color }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Recent Transactions */}
            <div className="flex flex-col">
              <RecentTransactions 
                transactions={transactions.slice(0, 5)} 
                loading={loading}
                title={`Transacciones de ${cards[cardIndex].name}`}
                filterCardId={cards[cardIndex]?.id}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts Section */}
      {cards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
              <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Gastos por Tarjeta
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: '#f1f5f9' }}
                    formatter={(value: any) => value ? formatCurrency(Number(value)).replace('COP', '').trim() : ''}
                    labelFormatter={(label: any) => {
                      const item = chartData.barData.find(d => d.name === label);
                      return item ? item.fullName : label;
                    }}
                  />
                  <Bar dataKey="monthly" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
              <h3 className="text-white text-lg font-semibold mb-4">Distribución de Gastos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    itemStyle={{ color: '#f1f5f9' }}
                    formatter={(value: any) => value ? formatCurrency(Number(value)).replace('COP', '').trim() : ''}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {chartData.pieData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-400 text-xs">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal */}
      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCard}
        editingCard={editingCard}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
        prefilledCardId={prefilledCardId}
        prefilledType={prefilledType}
      />
    </div>
  );
}
