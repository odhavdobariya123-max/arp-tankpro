import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CompanySettings {
  id: string;
  company_name: string;
  brand_name: string;
  gst_number: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  invoice_prefix: string;
  logo_url: string;
  created_at: string;
}

interface CompanyContextType {
  settings: CompanySettings | null;
  loading: boolean;
  error: string | null;
  rowsFetched: number;
  fetchSettings: () => Promise<void>;
  saveSettings: (data: Partial<Omit<CompanySettings, 'id' | 'created_at'>>) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsFetched, setRowsFetched] = useState(0);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('company_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError(extractError(fetchError));
      setSettings(null);
      setRowsFetched(0);
    } else {
      setSettings(data ?? null);
      setRowsFetched(data ? 1 : 0);
    }
    setLoading(false);
  }, []);

  const saveSettings = useCallback(async (data: Partial<Omit<CompanySettings, 'id' | 'created_at'>>) => {
    if (settings?.id) {
      const { error: updateError } = await supabase
        .from('company_settings')
        .update(data)
        .eq('id', settings.id);
      if (updateError) throw new Error(extractError(updateError));
    } else {
      const { error: insertError } = await supabase
        .from('company_settings')
        .insert([data]);
      if (insertError) throw new Error(extractError(insertError));
    }
    await fetchSettings();
  }, [settings, fetchSettings]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return (
    <CompanyContext.Provider value={{ settings, loading, error, rowsFetched, fetchSettings, saveSettings }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextType {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside CompanyProvider');
  return ctx;
}
