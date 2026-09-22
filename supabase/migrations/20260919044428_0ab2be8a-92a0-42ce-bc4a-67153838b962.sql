CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  address TEXT,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX salons_owner_idx ON public.salons(owner_id);
GRANT SELECT ON public.salons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO authenticated;
GRANT ALL ON public.salons TO service_role;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_salon(_salon_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salons s WHERE s.id = _salon_id AND s.owner_id = auth.uid());
$$;

CREATE POLICY "public salons readable" ON public.salons FOR SELECT USING (published = true);
CREATE POLICY "owner reads own salon" ON public.salons FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner creates salon" ON public.salons FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates salon" ON public.salons FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes salon" ON public.salons FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX services_salon_idx ON public.services(salon_id);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active services public" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "owner manages services" ON public.services FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));

CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX staff_salon_idx ON public.staff(salon_id);
GRANT SELECT ON public.staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active staff public" ON public.staff FOR SELECT USING (active = true);
CREATE POLICY "owner manages staff" ON public.staff FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));

CREATE TABLE public.staff_services (
  staff_id UUID NOT NULL REFERENCES public.staff ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);
GRANT SELECT ON public.staff_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_services TO authenticated;
GRANT ALL ON public.staff_services TO service_role;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff services public" ON public.staff_services FOR SELECT USING (true);
CREATE POLICY "owner manages staff services" ON public.staff_services FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));

CREATE TABLE public.working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE (staff_id, weekday)
);
CREATE INDEX working_hours_salon_idx ON public.working_hours(salon_id);
GRANT SELECT ON public.working_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_hours TO authenticated;
GRANT ALL ON public.working_hours TO service_role;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "working hours public" ON public.working_hours FOR SELECT USING (true);
CREATE POLICY "owner manages working hours" ON public.working_hours FOR ALL TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services ON DELETE RESTRICT,
  staff_id UUID REFERENCES public.staff ON DELETE SET NULL,
  customer_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bookings_salon_idx ON public.bookings(salon_id, starts_at);
CREATE INDEX bookings_customer_idx ON public.bookings(customer_user_id);
GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can request a booking" ON public.bookings FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "owner reads salon bookings" ON public.bookings FOR SELECT TO authenticated USING (public.owns_salon(salon_id));
CREATE POLICY "owner updates salon bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.owns_salon(salon_id)) WITH CHECK (public.owns_salon(salon_id));
CREATE POLICY "owner deletes salon bookings" ON public.bookings FOR DELETE TO authenticated USING (public.owns_salon(salon_id));
CREATE POLICY "customer reads own bookings" ON public.bookings FOR SELECT TO authenticated USING (customer_user_id = auth.uid());