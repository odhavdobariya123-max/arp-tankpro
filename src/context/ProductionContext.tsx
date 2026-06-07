import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ProductionEntry {
  id: string;
  production_date: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  stock_transaction_id: string | null;
  created_at: string;
}

interface ProductionContextType {
  entries: ProductionEntry[];
  loading: boolean;
  error: string | null;
  rowsFetched: number;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<ProductionEntry, 'id' | 'stock_transaction_id' | 'created_at'>) => Promise<void>;
  deleteEntry: (id: string, stockTxId: string | null) => Promise<void>;
}

const ProductionContext = createContext<ProductionContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function ProductionProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsFetched, setRowsFetched] = useState(0);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('production_entries')
      .select('*')
      .order('production_date', { ascending: false });

    if (fetchError) {
      setError(extractError(fetchError));
      setEntries([]);
      setRowsFetched(0);
    } else {
      const rows = (data as ProductionEntry[]) ?? [];
      setEntries(rows);
      setRowsFetched(rows.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entry: Omit<ProductionEntry, 'id' | 'stock_transaction_id' | 'created_at'>) => {
    setError(null);

    // Step 1: Insert stock_transaction (IN / PRODUCTION)
    const { data: txData, error: txError } = await supabase
      .from('stock_transactions')
      .insert([{
        product_id: entry.product_id,
        transaction_type: 'IN',
        reference_type: 'PRODUCTION',
        quantity: entry.quantity,
        notes: entry.notes ?? null,
      }])
      .select()
      .single();

    if (txError) {
      setError(extractError(txError));
      throw txError;
    }

    // Step 2: Insert production_entry linked to the stock_transaction
    const { error: entryError } = await supabase
      .from('production_entries')
      .insert([{
        production_date: entry.production_date,
        product_id: entry.product_id,
        quantity: entry.quantity,
        notes: entry.notes ?? null,
        stock_transaction_id: txData.id,
      }]);

    if (entryError) {
      setError(extractError(entryError));
      throw entryError;
    }

    await fetchEntries();
  };

  const deleteEntry = async (id: string, stockTxId: string | null) => {
    setError(null);

    // Delete production entry first (FK constraint)
    const { error: delEntryError } = await supabase
      .from('production_entries')
      .delete()
      .eq('id', id);

    if (delEntryError) {
      setError(extractError(delEntryError));
      throw delEntryError;
    }

    // Delete the linked stock transaction if it exists
    if (stockTxId) {
      const { error: delTxError } = await supabase
        .from('stock_transactions')
        .delete()
        .eq('id', stockTxId);

      if (delTxError) {
        setError(extractError(delTxError));
        throw delTxError;
      }
    }

    await fetchEntries();
  };

  return (
    <ProductionContext.Provider value={{
      entries, loading, error, rowsFetched,
      fetchEntries, addEntry, deleteEntry,
    }}>
      {children}
    </ProductionContext.Provider>
  );
}

export function useProduction() {
  const ctx = useContext(ProductionContext);
  if (!ctx) throw new Error('useProduction must be used within ProductionProvider');
  return ctx;
}
