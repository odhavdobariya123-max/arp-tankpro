-- Production Entries table for ARP TankPro ERP
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- NOTE: stock_transactions table must exist first (run 20240002 migration first)

CREATE TABLE IF NOT EXISTS production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  stock_transaction_id uuid REFERENCES stock_transactions(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON production_entries
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON production_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete" ON production_entries
  FOR DELETE USING (auth.role() = 'authenticated');
