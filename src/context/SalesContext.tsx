import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SalesInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface SalesInvoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  notes: string | null;
  created_at: string;
  items?: SalesInvoiceItem[];
}

export interface NewInvoiceItem {
  product_id: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface SalesContextType {
  invoices: SalesInvoice[];
  loading: boolean;
  error: string | null;
  rowsFetched: number;
  fetchInvoices: () => Promise<void>;
  addInvoice: (
    invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'items'>,
    items: NewInvoiceItem[]
  ) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

const SalesContext = createContext<SalesContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsFetched, setRowsFetched] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('sales_invoices')
      .select('*, items:sales_invoice_items(*)')
      .order('invoice_date', { ascending: false });

    if (fetchError) {
      setError(extractError(fetchError));
      setInvoices([]);
      setRowsFetched(0);
    } else {
      const rows = (data as SalesInvoice[]) ?? [];
      setInvoices(rows);
      setRowsFetched(rows.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const addInvoice = async (
    invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'items'>,
    items: NewInvoiceItem[]
  ) => {
    setError(null);

    // Step 1: Insert the invoice
    const { data: invData, error: invError } = await supabase
      .from('sales_invoices')
      .insert([invoice])
      .select()
      .single();

    if (invError) { setError(extractError(invError)); throw invError; }
    const invoiceId = invData.id;

    // Step 2: Insert all line items
    const itemsPayload = items.map(item => ({
      invoice_id: invoiceId,
      product_id: item.product_id,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    }));

    const { error: itemsError } = await supabase
      .from('sales_invoice_items')
      .insert(itemsPayload);

    if (itemsError) { setError(extractError(itemsError)); throw itemsError; }

    // Step 3: Create stock_transactions (OUT / SALE) — one per line item
    const stockTxPayload = items.map(item => ({
      product_id: item.product_id,
      transaction_type: 'OUT',
      reference_type: 'SALE',
      quantity: item.quantity,
      notes: `Invoice ${invoice.invoice_no}`,
    }));

    const { error: stockError } = await supabase
      .from('stock_transactions')
      .insert(stockTxPayload);

    if (stockError) { setError(extractError(stockError)); throw stockError; }

    // Step 4: Update customer outstanding (increment by invoice total_amount)
    const { data: custData, error: custFetchError } = await supabase
      .from('customers')
      .select('current_outstanding')
      .eq('id', invoice.customer_id)
      .single();

    if (!custFetchError && custData) {
      const newOutstanding = Number(custData.current_outstanding ?? 0) + Number(invoice.outstanding_amount);
      await supabase
        .from('customers')
        .update({ current_outstanding: newOutstanding })
        .eq('id', invoice.customer_id);
    }

    await fetchInvoices();
  };

  const deleteInvoice = async (id: string) => {
    setError(null);

    // Fetch invoice details before deleting (for reversal)
    const { data: invData } = await supabase
      .from('sales_invoices')
      .select('customer_id, outstanding_amount')
      .eq('id', id)
      .single();

    // Delete invoice (cascade deletes items via FK)
    const { error: delError } = await supabase
      .from('sales_invoices')
      .delete()
      .eq('id', id);

    if (delError) { setError(extractError(delError)); throw delError; }

    // Reverse customer outstanding
    if (invData) {
      const { data: custData } = await supabase
        .from('customers')
        .select('current_outstanding')
        .eq('id', invData.customer_id)
        .single();

      if (custData) {
        const reversed = Math.max(0, Number(custData.current_outstanding) - Number(invData.outstanding_amount));
        await supabase
          .from('customers')
          .update({ current_outstanding: reversed })
          .eq('id', invData.customer_id);
      }
    }

    await fetchInvoices();
  };

  return (
    <SalesContext.Provider value={{
      invoices, loading, error, rowsFetched,
      fetchInvoices, addInvoice, deleteInvoice,
    }}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within SalesProvider');
  return ctx;
}
