CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_name text NOT NULL,
  capacity text NOT NULL,
  layer_type text,
  color text,
  weight numeric,
  purchase_rate numeric,
  sale_rate numeric,
  status text DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_products" ON public.products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_products" ON public.products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_products" ON public.products FOR DELETE TO anon USING (true);

CREATE POLICY "auth_select_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_products" ON public.products FOR DELETE TO authenticated USING (true);
