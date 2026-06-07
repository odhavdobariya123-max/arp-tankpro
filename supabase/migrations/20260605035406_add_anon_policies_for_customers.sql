-- Allow anon role to perform CRUD on customers table
-- This is needed because the frontend uses the anon key (no Supabase Auth)

CREATE POLICY "Anon users can select customers"
  ON customers FOR SELECT
  TO anon USING (true);

CREATE POLICY "Anon users can insert customers"
  ON customers FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update customers"
  ON customers FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon users can delete customers"
  ON customers FOR DELETE
  TO anon USING (true);
