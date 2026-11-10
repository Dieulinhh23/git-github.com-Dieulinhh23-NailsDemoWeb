-- Fills the demo salon with a realistic menu and team so the booking page
-- has enough choice to feel like a working salon. Safe to run more than once.
DO $$
DECLARE
  salon uuid;
  staff_linh uuid := '11111111-1111-4111-8111-111111111105'::uuid;
  staff_mia uuid := '11111111-1111-4111-8111-111111111106'::uuid;
  staff_sofia uuid := '11111111-1111-4111-8111-111111111107'::uuid;
  staff_ava uuid := '11111111-1111-4111-8111-111111111108'::uuid;
  staff_daniel uuid := '11111111-1111-4111-8111-111111111109'::uuid;
BEGIN
  SELECT id INTO salon FROM public.salons WHERE slug = 'tom-and-jerry-nails';
  IF salon IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.services (salon_id, name, description, price_cents, duration_minutes, active)
  SELECT salon, v.name, v.description, v.price_cents, v.duration_minutes, true
  FROM (VALUES
    ('Polish Change', 'Quick refresh: file, shape, and a fresh coat of regular polish.', 1500, 15),
    ('Deluxe Spa Manicure', 'Exfoliating scrub, hydrating mask, hot towel, and hand massage.', 4500, 50),
    ('Dip Powder Manicure', 'Lightweight, chip-resistant colour that lasts three weeks or more.', 5000, 60),
    ('Builder Gel Overlay', 'Strengthening gel on your natural nails for growth and durability.', 5500, 60),
    ('Acrylic Full Set', 'New acrylic extensions in your choice of shape and length.', 6500, 75),
    ('Acrylic Fill', 'Rebalance and refill acrylics at two to three weeks.', 4500, 50),
    ('Gel-X Extensions', 'Soft-gel full-cover tips: natural look, lighter than acrylic.', 7500, 90),
    ('Gel Pedicure', 'Spa pedicure finished with long-wear gel polish.', 5500, 60),
    ('Mani + Pedi Combo', 'Classic manicure and spa pedicure in one visit.', 6500, 90),
    ('Kids'' Mani & Pedi', 'Gentle polish and care for ages 12 and under.', 3000, 40),
    ('Gel or Dip Removal', 'Safe soak-off removal with cuticle care and a nourishing oil.', 1200, 20),
    ('Paraffin Wax Treatment', 'Warm paraffin dip to soften and hydrate hands or feet.', 1500, 15)
  ) AS v(name, description, price_cents, duration_minutes)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.salon_id = salon AND s.name = v.name
  );

  INSERT INTO public.staff (id, salon_id, name, title, active)
  VALUES
    (staff_linh, salon, 'Linh', 'Master nail technician', true),
    (staff_mia, salon, 'Mia', 'Gel-X & nail art specialist', true),
    (staff_sofia, salon, 'Sofia', 'Pedicure specialist', true),
    (staff_ava, salon, 'Ava', 'Acrylic specialist', true),
    (staff_daniel, salon, 'Daniel', 'Nail technician', true)
  ON CONFLICT (id) DO NOTHING;

  -- Weekday 0 = Sunday. Everyone has days off, so availability varies by artist.
  INSERT INTO public.working_hours (salon_id, staff_id, weekday, start_time, end_time)
  SELECT salon, h.staff_id, d.weekday, h.start_time::time, h.end_time::time
  FROM (VALUES
    (staff_linh, ARRAY[2, 3, 4, 5, 6], '09:00', '18:00'),
    (staff_mia, ARRAY[3, 4, 5, 6], '11:00', '20:00'),
    (staff_mia, ARRAY[0], '10:00', '16:00'),
    (staff_sofia, ARRAY[1, 2, 3, 4, 5], '09:00', '17:00'),
    (staff_ava, ARRAY[1, 4, 5, 6], '10:00', '19:00'),
    (staff_ava, ARRAY[0], '10:00', '16:00'),
    (staff_daniel, ARRAY[1, 2, 5, 6], '12:00', '20:00')
  ) AS h(staff_id, days, start_time, end_time)
  CROSS JOIN LATERAL unnest(h.days) AS d(weekday)
  ON CONFLICT (staff_id, weekday) DO NOTHING;
END $$;
