import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type PaymentMode = 'Cash' | 'Bank Transfer' | 'Cheque' | 'UPI' | 'Other';

export interface PaymentCollection {
  id: string;
  customer_id: string;
  payment_date: string;
  amount: number;
  payment_mode: PaymentMode;
  notes: string | null;
  created_at: string;
}

interface PaymentContextType {
  payments: PaymentCollection[];
  loading: boolean;
  error: string | null;
  rowsFetched: number;
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Omit<PaymentCollection, 'id' | 'created_at'>) => Promise<void>;
  deletePayment: (id: string, customerId: string, amount: number) => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [payments, setPayments] = useState<PaymentCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsFetched, setRowsFetched] = useState(0);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('payment_collections')
      .select('*')
      .order('payment_date', { ascending: false });

    if (fetchError) {
      setError(extractError(fetchError));
      setPayments([]);
      setRowsFetched(0);
    } else {
      const rows = (data as PaymentCollection[]) ?? [];
      setPayments(rows);
      setRowsFetched(rows.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const addPayment = async (payment: Omit<PaymentCollection, 'id' | 'created_at'>) => {
    setError(null);

    // Step 1: Insert payment record
    const { error: insertError } = await supabase
      .from('payment_collections')
      .insert([payment]);

    if (insertError) { setError(extractError(insertError)); throw insertError; }

    // Step 2: Reduce customer outstanding
    const { data: custData, error: custFetchError } = await supabase
      .from('customers')
      .select('current_outstanding')
      .eq('id', payment.customer_id)
      .single();

    if (!custFetchError && custData) {
      const newOutstanding = Math.max(0, Number(custData.current_outstanding ?? 0) - Number(payment.amount));
      await supabase
        .from('customers')
        .update({ current_outstanding: newOutstanding })
        .eq('id', payment.customer_id);
    }

    await fetchPayments();
  };

  const deletePayment = async (id: string, customerId: string, amount: number) => {
    setError(null);

    const { error: delError } = await supabase
      .from('payment_collections')
      .delete()
      .eq('id', id);

    if (delError) { setError(extractError(delError)); throw delError; }

    // Reverse: add the amount back to customer outstanding
    const { data: custData } = await supabase
      .from('customers')
      .select('current_outstanding')
      .eq('id', customerId)
      .single();

    if (custData) {
      const restored = Number(custData.current_outstanding ?? 0) + Number(amount);
      await supabase
        .from('customers')
        .update({ current_outstanding: restored })
        .eq('id', customerId);
    }

    await fetchPayments();
  };

  return (
    <PaymentContext.Provider value={{
      payments, loading, error, rowsFetched,
      fetchPayments, addPayment, deletePayment,
    }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayments() {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error('usePayments must be used within PaymentProvider');
  return ctx;
}
