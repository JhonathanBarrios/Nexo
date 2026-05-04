import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Minus, Calendar, Tag, DollarSign, CreditCard, ArrowRightLeft } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useTransactions, type TransactionsFilters } from '../hooks/useTransactions'
import { useCards } from '../hooks/useCards'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (transaction: any) => void
  editingTransaction?: any
  prefilledCardId?: string
  prefilledType?: 'income' | 'expense' | 'payment' | 'withdrawal'
}

export function TransactionModal({ isOpen, onClose, onSuccess, editingTransaction, prefilledCardId, prefilledType }: TransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense' | 'payment' | 'withdrawal'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [cardId, setCardId] = useState('')
  const [sourceCardId, setSourceCardId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  
  const { categories } = useCategories()
  const { cards } = useCards()
  
  // Filtros mínimos (solo necesitamos las funciones de mutación)
  const defaultFilters: TransactionsFilters = {
    page: 1,
    pageSize: 1,
    sortBy: 'date',
    sortOrder: 'desc',
  };
  const { createTransaction, updateTransaction } = useTransactions(defaultFilters)
  const { user } = useAuthStore()

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setDescription(editingTransaction.description)
        setAmount(editingTransaction.amount.toString())
        setCategoryId(editingTransaction.category_id || '')
        setCardId(editingTransaction.card_id || '')
        setSourceCardId(editingTransaction.source_card_id || '')
        setDate(editingTransaction.date)
        setType(editingTransaction.type)
      } else {
        setDescription('')
        setAmount('')
        setCategoryId('')
        setCardId(prefilledCardId || '')
        setSourceCardId('')
        setDate(new Date().toISOString().split('T')[0])
        setType(prefilledType || 'expense')
      }
    }
  }, [isOpen, editingTransaction, prefilledCardId, prefilledType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user?.id) {
        toast.error('No se pudo obtener el usuario')
        setLoading(false)
        return
      }

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          category_id: categoryId || null,
          card_id: cardId || null,
          source_card_id: sourceCardId || null,
          description,
          amount: parseFloat(amount),
          type,
          date,
          notes: null,
        })
        toast.success('Transacción actualizada correctamente')
        onClose()
        onSuccess?.({ ...editingTransaction, category_id: categoryId, card_id: cardId, source_card_id: sourceCardId, description, amount: parseFloat(amount), type, date })
      } else {
        await createTransaction({
          user_id: user.id,
          category_id: categoryId || null,
          card_id: cardId || null,
          source_card_id: sourceCardId || null,
          description,
          amount: parseFloat(amount),
          type,
          date,
          notes: null,
        })
        toast.success('Transacción creada correctamente')
        onClose()
        onSuccess?.({ card_id: cardId, source_card_id: sourceCardId, description, amount: parseFloat(amount), type, date })
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

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
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl font-semibold">{editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Toggle */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      type === 'expense'
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Minus className="w-5 h-5" />
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      type === 'income'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('payment')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      type === 'payment'
                        ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Pago TC
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('withdrawal')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      type === 'withdrawal'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                    Retiro
                  </button>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Ej: Supermercado"
                    required
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Monto</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={amount ? Number(amount).toLocaleString('es-CO') : ''}
                      onChange={(e) => {
                        // Remove non-numeric characters and convert to number
                        const numericValue = e.target.value.replace(/\D/g, '');
                        setAmount(numericValue);
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Card */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {type === 'withdrawal' ? 'Tarjeta destino (Efectivo)' : type === 'payment' ? 'Tarjeta de crédito' : 'Tarjeta'}
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Seleccionar tarjeta</option>
                      {type === 'withdrawal' ? (
                        cards.filter(c => c.is_active && c.type === 'cash').map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))
                      ) : type === 'payment' ? (
                        cards.filter(c => c.is_active && c.type === 'credit').map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} - •••• {card.last_four}
                          </option>
                        ))
                      ) : (
                        cards.filter(c => c.is_active).map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} - •••• {card.last_four}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Source Card - Solo para pagos y retiros */}
                {(type === 'payment' || type === 'withdrawal') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {type === 'withdrawal' ? 'Tarjeta origen (de donde sale)' : 'Tarjeta origen (requerido)'}
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={sourceCardId}
                        onChange={(e) => setSourceCardId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Seleccionar tarjeta origen</option>
                        {cards.filter(c => c.is_active && (c.type === 'debit' || c.type === 'cash') && c.id !== cardId).map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} - •••• {card.last_four}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      {type === 'withdrawal' ? 'De donde sale el dinero para efectivo' : 'De donde sale el dinero (solo debito/efectivo)'}
                    </p>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      {editingTransaction ? 'Guardar Cambios' : 'Agregar Transacción'}
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}