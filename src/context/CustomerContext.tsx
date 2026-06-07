import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Customer } from '../types';
import { supabase } from '../lib/supabase';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setCustomers((data as Customer[]) ?? []);
    } catch (err: any) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>) => {
    setError(null);
    const { data, error: insertError } = await supabase
      .from('customers')
      .insert([customer])
      .select();

    console.log('INSERT RESULT', data, insertError);

    if (insertError) {
      setError(extractError(insertError));
      throw insertError;
    }
    await fetchCustomers();
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setError(null);
    const { error: updateError } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(extractError(updateError));
      throw updateError;
    }
    await fetchCustomers();
  };

  const deleteCustomer = async (id: string) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(extractError(deleteError));
      throw deleteError;
    }
    await fetchCustomers();
  };

  return (
    <CustomerContext.Provider value={{
      customers, loading, error, fetchCustomers, addCustomer, updateCustomer, deleteCustomer
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomers must be used within CustomerProvider');
  return ctx;
}
