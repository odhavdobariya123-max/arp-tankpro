import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { TransactionType, ReferenceType } from '../types';
import { supabase } from '../lib/supabase';

export interface StockTransaction {
  id: string;
  product_id: string;
  transaction_type: TransactionType;
  reference_type: ReferenceType;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface StockLevel {
  product_id: string;
  total_in: number;
  total_out: number;
  current_stock: number;
}

interface StockContextType {
  transactions: StockTransaction[];
  stockLevels: StockLevel[];
  loading: boolean;
  error: string | null;
  rowsFetched: number;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Omit<StockTransaction, 'id' | 'created_at'>) => Promise<void>;
}

const StockContext = createContext<StockContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

function computeStockLevels(transactions: StockTransaction[]): StockLevel[] {
  const map: Record<string, StockLevel> = {};
  for (const tx of transactions) {
    if (!map[tx.product_id]) {
      map[tx.product_id] = { product_id: tx.product_id, total_in: 0, total_out: 0, current_stock: 0 };
    }
    if (tx.transaction_type === 'IN') {
      map[tx.product_id].total_in += tx.quantity;
    } else {
      map[tx.product_id].total_out += tx.quantity;
    }
    map[tx.product_id].current_stock = map[tx.product_id].total_in - map[tx.product_id].total_out;
  }
  return Object.values(map);
}

export function StockProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsFetched, setRowsFetched] = useState(0);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('stock_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(extractError(fetchError));
      setTransactions([]);
      setStockLevels([]);
      setRowsFetched(0);
    } else {
      const txs = (data as StockTransaction[]) ?? [];
      setTransactions(txs);
      setStockLevels(computeStockLevels(txs));
      setRowsFetched(txs.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (tx: Omit<StockTransaction, 'id' | 'created_at'>) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('stock_transactions')
      .insert([tx])
      .select();

    if (insertError) {
      setError(extractError(insertError));
      throw insertError;
    }
    await fetchTransactions();
  };

  return (
    <StockContext.Provider value={{
      transactions, stockLevels, loading, error, rowsFetched,
      fetchTransactions, addTransaction,
    }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be used within StockProvider');
  return ctx;
}
