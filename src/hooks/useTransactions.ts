import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  card_id: string | null
  source_card_id: string | null
  description: string
  amount: number
  type: 'income' | 'expense' | 'savings' | 'payment' | 'withdrawal'
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface CreateTransactionInput extends Omit<Transaction, 'id' | 'created_at' | 'updated_at'> {
  installments_count?: number
}

export interface TransactionsFilters {
  startDate?: string
  endDate?: string
  categoryId?: string
  cardId?: string
  type?: string
  page: number
  pageSize: number
  sortBy: 'date' | 'amount'
  sortOrder: 'asc' | 'desc'
}

export function useTransactions(filters: TransactionsFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totals, setTotals] = useState<{ totalIncome: number; totalExpense: number; totalCardPayments: number }>({ totalIncome: 0, totalExpense: 0, totalCardPayments: 0 })

  useEffect(() => {
    fetchTransactions()
  }, [filters.startDate, filters.endDate, filters.categoryId, filters.cardId, filters.type, filters.page, filters.pageSize, filters.sortBy, filters.sortOrder])

  useEffect(() => {
    fetchTotals()
  }, [filters.startDate, filters.endDate, filters.categoryId, filters.cardId])

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const buildDateWithDay = (year: number, month: number, day: number): Date => {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(day, lastDayOfMonth))
  }

  const calculateFirstInstallmentDate = (
    purchaseDate: string,
    cutDate: number,
    paymentDate: number
  ): string => {
    const purchase = new Date(`${purchaseDate}T00:00:00`)
    const shouldPaySameMonth = purchase.getDate() <= cutDate
    const targetMonth = shouldPaySameMonth ? purchase.getMonth() : purchase.getMonth() + 1
    const targetDate = buildDateWithDay(purchase.getFullYear(), targetMonth, paymentDate)
    return formatDate(targetDate)
  }

  const fetchTotals = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select('type, amount')

      // Aplicar mismos filtros que fetchTransactions pero sin paginación
      // IMPORTANTE: Ignoramos filtro de tipo para que los KPIs siempre muestren el panorama completo
      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters.cardId) {
        query = query.eq('card_id', filters.cardId)
      }
      // NO aplicamos filtro de tipo aquí para mantener KPIs consistentes

      const { data, error } = await query

      if (error) throw error

      const totalIncome = (data || [])
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

      const totalExpense = (data || [])
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

      const totalCardPayments = (data || [])
        .filter((t: any) => t.type === 'payment')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

      setTotals({ totalIncome, totalExpense, totalCardPayments })
    } catch (err: any) {
      console.error('Error fetching totals:', err)
    }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })

      // Filtro de fecha
      if (filters.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate)
      }

      // Filtro de categoría
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      // Filtro de tarjeta
      if (filters.cardId) {
        query = query.eq('card_id', filters.cardId)
      }

      // Filtro de tipo
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      // Ordenamiento
      const sortByField = filters.sortBy === 'date' ? 'created_at' : filters.sortBy;
      query = query.order(sortByField, { ascending: filters.sortOrder === 'asc' })

      // Paginación
      const from = (filters.page - 1) * filters.pageSize
      const to = from + filters.pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error
      setTransactions(data || [])
      setTotalCount(count || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createTransaction = async (transaction: CreateTransactionInput) => {
    try {
      const { installments_count = 1, ...transactionPayload } = transaction

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionPayload)
        .select()
        .single()

      if (error) throw error

      const isCreditInstallmentPurchase =
        transaction.type === 'expense' &&
        !!transaction.card_id &&
        installments_count > 1

      if (isCreditInstallmentPurchase) {
        try {
          const { data: cardData, error: cardError } = await supabase
            .from('cards')
            .select('id, name, type, cut_date, payment_date')
            .eq('id', transaction.card_id)
            .single()

          if (cardError) throw cardError

          const card = cardData as {
            id: string
            name: string
            type: 'credit' | 'debit' | 'cash'
            cut_date: number | null
            payment_date: number | null
          }

          if (card.type === 'credit' && card.cut_date && card.payment_date) {
            const amountPerInstallment = Number((transaction.amount / installments_count).toFixed(2))
            const firstDueDate = calculateFirstInstallmentDate(
              transaction.date,
              card.cut_date,
              card.payment_date
            )

            const { error: recurringError } = await supabase
              .from('recurring_payments')
              .insert({
                user_id: transaction.user_id,
                category_id: transaction.category_id,
                description: `Cuotas de ${transaction.description} - ${card.name}`,
                amount: amountPerInstallment,
                frequency: 'monthly',
                next_due_date: firstDueDate,
                custom_days: null,
                is_active: true,
                is_variable: false,
                pending_cycles: 0,
                total_pending_amount: 0,
                is_installment: true,
                total_cycles: installments_count,
                remaining_cycles: installments_count,
                card_id: card.id,
              })

            if (recurringError) throw recurringError
          }
        } catch (installmentError) {
          await supabase.from('transactions').delete().eq('id', data.id)
          throw installmentError
        }
      }

      setTransactions([data, ...transactions])
      fetchTotals() // Actualizar totales después de crear
      return data
    } catch (err: any) {
      throw err
    }
  }

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setTransactions(transactions.map(tx => tx.id === id ? data : tx))
      fetchTotals() // Actualizar totales después de actualizar
      return data
    } catch (err: any) {
      throw err
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTransactions(transactions.filter(tx => tx.id !== id))
      fetchTotals() // Actualizar totales después de eliminar
    } catch (err: any) {
      throw err
    }
  }

  return {
    transactions,
    loading,
    error,
    totalCount,
    totals,
    refetch: fetchTransactions,
    refetchTotals: fetchTotals,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}