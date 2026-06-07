import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Product } from '../types';
import { supabase } from '../lib/supabase';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | null>(null);

function extractError(err: any): string {
  if (err?.message) return err.message;
  if (err?.details) return err.details;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(extractError(fetchError));
    } else {
      setProducts((data as Product[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
    setError(null);
    const { data, error: insertError } = await supabase
      .from('products')
      .insert([product])
      .select();

    console.log('INSERT RESULT', data, insertError);

    if (insertError) {
      setError(extractError(insertError));
      throw insertError;
    }
    await fetchProducts();
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setError(null);
    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(extractError(updateError));
      throw updateError;
    }
    await fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(extractError(deleteError));
      throw deleteError;
    }
    await fetchProducts();
  };

  return (
    <ProductContext.Provider value={{
      products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct,
    }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within ProductProvider');
  return ctx;
}
