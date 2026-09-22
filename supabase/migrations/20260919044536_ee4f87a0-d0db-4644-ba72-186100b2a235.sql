GRANT SELECT (id, salon_id, staff_id, service_id, starts_at, ends_at, status) ON public.bookings TO anon;
CREATE POLICY "busy slots visible for published salons" ON public.bookings FOR SELECT TO anon
USING (status <> 'cancelled' AND EXISTS (SELECT 1 FROM public.salons s WHERE s.id = bookings.salon_id AND s.published = true));