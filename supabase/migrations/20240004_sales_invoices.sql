-- Sales Invoices tables for ARP TankPro ERP
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  invoice_date date NOT NULL DEFAULT current_date,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  outstanding_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL
);

-- Enable Row Level Security
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read invoices" ON sales_invoices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert invoices" ON sales_invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete invoices" ON sales_invoices
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read items" ON sales_invoice_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert items" ON sales_invoice_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete items" ON sales_invoice_items
  FOR DELETE USING (auth.role() = 'authenticated');
