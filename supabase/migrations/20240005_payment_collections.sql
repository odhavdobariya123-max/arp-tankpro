-- Payment Collections table for ARP TankPro ERP
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS payment_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_mode text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE payment_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON payment_collections
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON payment_collections
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON payment_collections
  FOR DELETE USING (auth.role() = 'authenticated');
