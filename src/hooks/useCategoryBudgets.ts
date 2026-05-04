import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';

export interface CategoryBudget {
  id: string;
  category_id: string;
  budget_amount: number;
  budget_period: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export function useCategoryBudgets(categoryId?: string) {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!categoryId) {
        setBudgets([]);
        return;
      }

      const { data, error } = await supabase
        .from('category_budgets')
        .select('*')
        .eq('category_id', categoryId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveBudget = async (budget: {
    category_id: string;
    budget_amount: number;
    budget_period: string;
    start_date: string;
    end_date: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('category_budgets')
        .insert(budget)
        .select()
        .single();

      if (error) throw error;
      setBudgets([data, ...budgets]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBudgetForDate = useCallback(async (categoryId: string, date: Date): Promise<number> => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('category_budgets')
        .select('budget_amount, budget_period')
        .eq('category_id', categoryId)
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .maybeSingle();

      if (error || !data) {
        return 0;
      }

      // Convertir a mensual si es necesario
      const { convertToMonthly } = await import('../utils/budget');
      return convertToMonthly(data.budget_amount, data.budget_period as any);
    } catch (err: any) {
      console.error('Error getting budget for date:', err);
      return 0;
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [categoryId]);

  return {
    budgets,
    loading,
    error,
    saveBudget,
    getBudgetForDate,
    refetch: fetchBudgets,
  };
}
