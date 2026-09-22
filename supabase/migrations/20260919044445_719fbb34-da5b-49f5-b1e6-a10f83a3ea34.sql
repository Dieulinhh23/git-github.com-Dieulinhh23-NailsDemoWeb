CREATE OR REPLACE FUNCTION public.owns_salon(_salon_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salons s WHERE s.id = _salon_id AND s.owner_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;