
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Stores
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  kit_id TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'berry',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#CF3790',
  payment_email TEXT,
  shipping_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published stores are public" ON public.stores
  FOR SELECT TO anon, authenticated USING (status = 'published' OR auth.uid() = owner_id);
CREATE POLICY "Owners insert stores" ON public.stores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update stores" ON public.stores
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete stores" ON public.stores
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER stores_touch BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Products
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT SELECT ON public.store_products TO anon;
GRANT ALL ON public.store_products TO service_role;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products of published stores are public" ON public.store_products
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND (s.status = 'published' OR s.owner_id = auth.uid()))
  );
CREATE POLICY "Owners write products" ON public.store_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Orders
CREATE TABLE public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.store_orders TO authenticated;
GRANT INSERT ON public.store_orders TO anon, authenticated;
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order in a published store" ON public.store_orders
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.status = 'published')
  );
CREATE POLICY "Owners read their orders" ON public.store_orders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Owners update their orders" ON public.store_orders
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  );
