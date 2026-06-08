import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DealerScheme {
  id: string;
  dealer_id: string;
  scheme_name: string;
  scheme_type: string;
  target_amount: number;
  target_quantity: number;
  benefit_type: string;
  benefit_value: number;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export type NewDealerScheme = Omit<DealerScheme, 'id' | 'created_at'>;

interface DealerSchemeContextType {
  schemes: DealerScheme[];
  loading: boolean;
  error: string | null;
  rowsFetched: number;
  fetchSchemes: () => Promise<void>;
  addScheme: (scheme: NewDealerScheme) => Promise<void>;
  updateScheme: (id: string, updates: Partial<DealerScheme>) => Promise<void>;
  deleteScheme: (id: string) => Promise<void>;
}

const DealerSchemeContext = createContext<DealerSchemeContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function DealerSchemeProvider({ children }: { children: React.ReactNode }) {
  const [schemes, setSchemes] = useState<DealerScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsFetched, setRowsFetched] = useState(0);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('dealer_schemes')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(extractError(fetchError));
      setSchemes([]);
      setRowsFetched(0);
    } else {
      setSchemes(data ?? []);
      setRowsFetched(data?.length ?? 0);
    }
    setLoading(false);
  }, []);

  const addScheme = useCallback(async (scheme: NewDealerScheme) => {
    const { error: insertError } = await supabase.from('dealer_schemes').insert([scheme]);
    if (insertError) throw new Error(extractError(insertError));
    await fetchSchemes();
  }, [fetchSchemes]);

  const updateScheme = useCallback(async (id: string, updates: Partial<DealerScheme>) => {
    const { error: updateError } = await supabase.from('dealer_schemes').update(updates).eq('id', id);
    if (updateError) throw new Error(extractError(updateError));
    await fetchSchemes();
  }, [fetchSchemes]);

  const deleteScheme = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('dealer_schemes').delete().eq('id', id);
    if (deleteError) throw new Error(extractError(deleteError));
    await fetchSchemes();
  }, [fetchSchemes]);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  return (
    <DealerSchemeContext.Provider value={{ schemes, loading, error, rowsFetched, fetchSchemes, addScheme, updateScheme, deleteScheme }}>
      {children}
    </DealerSchemeContext.Provider>
  );
}

export function useDealerSchemes(): DealerSchemeContextType {
  const ctx = useContext(DealerSchemeContext);
  if (!ctx) throw new Error('useDealerSchemes must be used inside DealerSchemeProvider');
  return ctx;
}
