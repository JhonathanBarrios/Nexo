import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

export interface Card {
  id: string;
  user_id: string;
  name: string;
  bank: string;
  type: 'credit' | 'debit' | 'prepaid';
  last_four: string;
  credit_limit: number | null;
  cut_date: number | null;
  payment_date: number | null;
  color: string;
  icon: string;
  is_active: boolean;
  current_balance: number;
  current_debt: number;
  created_at: string;
  updated_at: string;
}

export function useCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCards([]);
        return;
      }

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCard = async (cardData: Omit<Card, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('cards')
        .insert({
          ...cardData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchCards();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const updateCard = async (id: string, cardData: Partial<Card>) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .update(cardData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchCards();
      return data;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCards();
    } catch (err: any) {
      throw err;
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  return {
    cards,
    loading,
    error,
    refetch: fetchCards,
    createCard,
    updateCard,
    deleteCard,
  };
}
