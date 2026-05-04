import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

export interface Card {
  id: string;
  user_id: string;
  name: string;
  bank: string;
  type: 'credit' | 'debit' | 'cash';
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

  const updateCardBalance = (cardId: string, transaction: any) => {
    setCards(prevCards => {
      return prevCards.map(card => {
        if (card.id === cardId) {
          const amount = Number(transaction.amount);
          let newBalance = Number(card.current_balance);
          let newDebt = Number(card.current_debt);

          switch (transaction.type) {
            case 'expense':
              if (card.type === 'credit') {
                newDebt += amount;
              } else {
                newBalance -= amount;
              }
              break;
            case 'income':
              newBalance += amount;
              break;
            case 'payment':
              if (card.type === 'credit') {
                newDebt -= amount;
              }
              break;
            case 'withdrawal':
              if (card.type === 'cash') {
                newBalance += amount;
              }
              break;
          }

          return {
            ...card,
            current_balance: newBalance,
            current_debt: newDebt,
          };
        }
        return card;
      });
    });
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
    updateCardBalance,
  };
}
