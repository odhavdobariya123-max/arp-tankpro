-- Stock Transactions table for ARP TankPro ERP
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  reference_type text CHECK (reference_type IN ('PRODUCTION', 'SALE', 'ADJUSTMENT')),
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read" ON stock_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON stock_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
