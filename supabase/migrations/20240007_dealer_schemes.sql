-- Dealer Schemes table for ARP TankPro ERP
CREATE TABLE IF NOT EXISTS dealer_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  scheme_name text NOT NULL,
  scheme_type text,
  target_amount numeric DEFAULT 0,
  target_quantity integer DEFAULT 0,
  benefit_type text,
  benefit_value numeric DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'Active',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dealer_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read dealer_schemes"
  ON dealer_schemes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth insert dealer_schemes"
  ON dealer_schemes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth update dealer_schemes"
  ON dealer_schemes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth delete dealer_schemes"
  ON dealer_schemes FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_dealer_schemes_dealer_id ON dealer_schemes(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_schemes_status ON dealer_schemes(status);
