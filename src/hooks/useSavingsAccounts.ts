import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface SavingsAccount {
  id: string
  user_id: string
  name: string
  goal_amount: number | null
  goal_duration_months: number | null
  current_balance: number
  color: string
  icon: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | null
  deposit_day: number | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  is_completed: boolean
  is_goal_based: boolean
  created_at: string
  updated_at: string
}

export interface SavingsDeposit {
  id: string
  user_id: string
  savings_account_id: string
  amount: number
  deposit_date: string
  period_number: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SavingsProgress {
  totalDeposits: number
  expectedDeposits: number
  percentComplete: number
  currentPeriod: number
  periodsCompleted: number
  idealSavedPerPeriod: number
  actualSavedPerPeriod: number
  streak: number
}

const frequencyMultipliers: Record<string, number> = {
  weekly: 4,
  biweekly: 2,
  monthly: 1,
}

function calculateEndDate(startDate: Date, durationMonths: number): Date {
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + durationMonths)
  return endDate
}

function calculateExpectedDeposits(
  durationMonths: number,
  frequency: 'weekly' | 'biweekly' | 'monthly'
): number {
  return durationMonths * frequencyMultipliers[frequency]
}

function calculateGoalPerPeriod(
  goalAmount: number,
  durationMonths: number,
  frequency: 'weekly' | 'biweekly' | 'monthly'
): number {
  const totalDeposits = calculateExpectedDeposits(durationMonths, frequency)
  return goalAmount / totalDeposits
}

function calculateCurrentPeriod(
  _depositDay: number,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  startDate: Date
): number {
  const today = new Date()
  const monthsDiff =
    (today.getFullYear() - startDate.getFullYear()) * 12 +
    (today.getMonth() - startDate.getMonth())

  switch (frequency) {
    case 'weekly': {
      const daysDiff = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return Math.floor(daysDiff / 7) + 1
    }
    case 'biweekly': {
      const daysDiff = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return Math.floor(daysDiff / 14) + 1
    }
    case 'monthly':
    default:
      return monthsDiff + 1
  }
}

function calculateProgress(
  account: SavingsAccount,
  deposits: SavingsDeposit[]
): SavingsProgress {
  if (!account.is_goal_based) {
    const totalDepositsAmount = deposits.reduce((sum, d) => sum + d.amount, 0)
    return {
      totalDeposits: totalDepositsAmount,
      expectedDeposits: 0,
      percentComplete: 0,
      currentPeriod: 1,
      periodsCompleted: 0,
      idealSavedPerPeriod: 0,
      actualSavedPerPeriod: 0,
      streak: 0,
    }
  }

  const expectedDeposits = calculateExpectedDeposits(
    account.goal_duration_months!,
    account.frequency!
  )
  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0)
  const percentComplete = account.goal_amount! > 0 ? (totalDeposits / account.goal_amount!) * 100 : 0
  const idealSavedPerPeriod = calculateGoalPerPeriod(
    account.goal_amount!,
    account.goal_duration_months!,
    account.frequency!
  )
  const actualSavedPerPeriod =
    expectedDeposits > 0 ? totalDeposits / expectedDeposits : 0

  const currentPeriod = calculateCurrentPeriod(
    account.deposit_day!,
    account.frequency!,
    new Date(account.start_date!)
  )

  const periodsCompleted = deposits.reduce((count, d) => {
    return d.period_number < currentPeriod ? count + 1 : count
  }, 0)

  let streak = 0
  const depositsByPeriod = new Map<number, number>()
  deposits.forEach((d) => {
    const current = depositsByPeriod.get(d.period_number) || 0
    depositsByPeriod.set(d.period_number, current + d.amount)
  })

  for (let i = 1; i <= currentPeriod - 1; i++) {
    const periodAmount = depositsByPeriod.get(i) || 0
    if (periodAmount >= idealSavedPerPeriod * 0.9) {
      streak++
    } else {
      break
    }
  }

  return {
    totalDeposits,
    expectedDeposits,
    percentComplete,
    currentPeriod,
    periodsCompleted,
    idealSavedPerPeriod,
    actualSavedPerPeriod,
    streak,
  }
}

export function useSavingsAccounts() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [deposits, setDeposits] = useState<Map<string, SavingsDeposit[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('savings_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])

      const depositsMap = new Map<string, SavingsDeposit[]>()
      for (const account of data || []) {
        const { data: accountDeposits } = await supabase
          .from('savings_deposits')
          .select('*')
          .eq('savings_account_id', account.id)
          .order('deposit_date', { ascending: true })
        depositsMap.set(account.id, accountDeposits || [])
      }
      setDeposits(depositsMap)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const createAccount = async (
    account: Omit<SavingsAccount, 'id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_completed' | 'end_date'>
  ) => {
    try {
      const insertData: any = {
        user_id: account.user_id,
        name: account.name,
        is_goal_based: account.is_goal_based,
        current_balance: 0,
        is_completed: false,
        color: account.color,
        icon: account.icon,
      };

      if (account.is_goal_based && account.goal_amount && account.goal_duration_months && account.frequency) {
        insertData.goal_amount = account.goal_amount;
        insertData.goal_duration_months = account.goal_duration_months;
        insertData.frequency = account.frequency;
        insertData.deposit_day = account.deposit_day;
        insertData.start_date = account.start_date;
        const startDate = new Date(account.start_date!);
        const endDate = calculateEndDate(startDate, account.goal_duration_months);
        insertData.end_date = endDate.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('savings_accounts')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      setAccounts([data, ...accounts])
      deposits.set(data.id, [])
      setDeposits(new Map(deposits))
      return data
    } catch (err: any) {
      throw err
    }
  }

  const updateAccount = async (
    id: string,
    updates: Partial<SavingsAccount>
  ) => {
    try {
      if (updates.goal_duration_months && updates.start_date) {
        const startDate = new Date(updates.start_date)
        const endDate = calculateEndDate(startDate, updates.goal_duration_months)
        updates.end_date = endDate.toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('savings_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setAccounts(accounts.map((a) => (a.id === id ? data : a)))
      return data
    } catch (err: any) {
      throw err
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('savings_accounts')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAccounts(accounts.filter((a) => a.id !== id))
      deposits.delete(id)
      setDeposits(new Map(deposits))
    } catch (err: any) {
      throw err
    }
  }

  const markAsCompleted = async (id: string) => {
    return updateAccount(id, { is_completed: true, is_active: false })
  }

  const createDeposit = async (
    deposit: Omit<SavingsDeposit, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: depositData, error: depositError } = await supabase
        .from('savings_deposits')
        .insert(deposit)
        .select()
        .single()

      if (depositError) throw depositError

      const account = accounts.find((a) => a.id === deposit.savings_account_id)
      if (!account) throw new Error('Account not found')

      const newBalance = account.current_balance + deposit.amount
      const { data: updatedAccount, error: updateError } = await supabase
        .from('savings_accounts')
        .update({ current_balance: newBalance })
        .eq('id', deposit.savings_account_id)
        .select()
        .single()

      if (updateError) throw updateError

      await supabase.from('transactions').insert({
        user_id: deposit.user_id,
        category_id: null,
        card_id: null,
        description: `Depósito a "${account.name}"`,
        amount: deposit.amount,
        type: 'savings',
        date: deposit.deposit_date,
        notes: deposit.notes,
      })

      const accountDeposits = deposits.get(deposit.savings_account_id) || []
      deposits.set(deposit.savings_account_id, [...accountDeposits, depositData])
      setDeposits(new Map(deposits))
      setAccounts(accounts.map((a) => (a.id === deposit.savings_account_id ? updatedAccount : a)))

      return depositData
    } catch (err: any) {
      throw err
    }
  }

  const deleteDeposit = async (id: string, accountId: string) => {
    try {
      const deposit = deposits.get(accountId)?.find((d) => d.id === id)
      if (!deposit) throw new Error('Deposit not found')

      const { error: deleteError } = await supabase
        .from('savings_deposits')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      const account = accounts.find((a) => a.id === accountId)
      if (!account) throw new Error('Account not found')

      const newBalance = Math.max(0, account.current_balance - deposit.amount)
      const { data: updatedAccount, error: updateError } = await supabase
        .from('savings_accounts')
        .update({ current_balance: newBalance })
        .eq('id', accountId)
        .select()
        .single()

      if (updateError) throw updateError

      const accountDeposits = deposits.get(accountId) || []
      deposits.set(
        accountId,
        accountDeposits.filter((d) => d.id !== id)
      )
      setDeposits(new Map(deposits))
      setAccounts(accounts.map((a) => (a.id === accountId ? updatedAccount : a)))
    } catch (err: any) {
      throw err
    }
  }

  const getProgress = (accountId: string): SavingsProgress | null => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return null

    const accountDeposits = deposits.get(accountId) || []
    return calculateProgress(account, accountDeposits)
  }

  const getTotalSavings = (): number => {
    return accounts.reduce((sum, a) => sum + a.current_balance, 0)
  }

  const getMonthlyStats = (
    accountId: string,
    year: number
  ): { month: number; saved: number; ideal: number }[] => {
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return []

    const accountDeposits = deposits.get(accountId) || []
    let idealPerMonth = 0
    let frequencyMultiplier = 1

    if (account.is_goal_based && account.goal_amount && account.frequency) {
      idealPerMonth = calculateGoalPerPeriod(
        account.goal_amount,
        account.goal_duration_months!,
        account.frequency
      )
      frequencyMultiplier = frequencyMultipliers[account.frequency]
    }

    const monthlyData: { month: number; saved: number; ideal: number }[] = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      const saved = accountDeposits
        .filter((d) => {
          const depositDate = new Date(d.deposit_date)
          return depositDate >= monthStart && depositDate <= monthEnd
        })
        .reduce((sum, d) => sum + d.amount, 0)

      monthlyData.push({
        month: month + 1,
        saved,
        ideal: idealPerMonth * frequencyMultiplier,
      })
    }

    return monthlyData
  }

  return {
    accounts,
    deposits,
    loading,
    error,
    refetch: fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    markAsCompleted,
    createDeposit,
    deleteDeposit,
    getProgress,
    getTotalSavings,
    getMonthlyStats,
    calculateGoalPerPeriod: (goalAmount: number, durationMonths: number, frequency: 'weekly' | 'biweekly' | 'monthly') =>
      calculateGoalPerPeriod(goalAmount, durationMonths, frequency),
    calculateExpectedDeposits: (durationMonths: number, frequency: 'weekly' | 'biweekly' | 'monthly') =>
      calculateExpectedDeposits(durationMonths, frequency),
  }
}
