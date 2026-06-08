-- Company Settings table for ARP TankPro ERP
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  brand_name text,
  gst_number text,
  mobile text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  invoice_prefix text DEFAULT 'INV',
  logo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read company"
  ON company_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth insert company"
  ON company_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth update company"
  ON company_settings FOR UPDATE
  USING (auth.role() = 'authenticated');
