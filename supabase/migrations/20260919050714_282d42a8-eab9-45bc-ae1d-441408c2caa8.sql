DO $$
DECLARE
  owner uuid := '11111111-1111-4111-8111-111111111101'::uuid;
  salon uuid := '11111111-1111-4111-8111-111111111102'::uuid;
  staff_tom uuid := '11111111-1111-4111-8111-111111111103'::uuid;
  staff_jerry uuid := '11111111-1111-4111-8111-111111111104'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = owner) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'owner@tomandjerrynails.demo', crypt('demo-password-not-for-login', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tom & Jerry Demo Owner"}',
      now(), now()
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), owner, owner::text, jsonb_build_object('sub', owner::text, 'email', 'owner@tomandjerrynails.demo'), 'email', now(), now(), now());
  END IF;

  INSERT INTO public.salons (id, owner_id, name, slug, tagline, address, phone, timezone, published)
  VALUES (salon, owner, 'Tom & Jerry Nails', 'tom-and-jerry-nails',
          'Beautiful nails, made personal.', '123 Main Street', '(555) 010-2020',
          'America/New_York', true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.services (salon_id, name, description, price_cents, duration_minutes, active)
  SELECT salon, v.name, v.description, v.price_cents, v.duration_minutes, true
  FROM (VALUES
    ('Classic Manicure', 'Shaping, cuticle care, and a flawless polish finish.', 2500, 30),
    ('Gel Manicure', 'Long-lasting gel colour with up to two weeks of shine.', 4000, 45),
    ('Spa Pedicure', 'Relaxing soak, exfoliation, and precision polish.', 4500, 60),
    ('Nail Art Add-On', 'French tips, chrome, or hand-painted designs.', 1500, 30)
  ) AS v(name, description, price_cents, duration_minutes)
  WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE salon_id = salon);

  INSERT INTO public.staff (id, salon_id, name, title, active)
  SELECT v.id, salon, v.name, v.title, true
  FROM (VALUES
    (staff_tom, 'Tom', 'Senior nail technician'),
    (staff_jerry, 'Jerry', 'Nail artist')
  ) AS v(id, name, title)
  WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE salon_id = salon);

  INSERT INTO public.working_hours (salon_id, staff_id, weekday, start_time, end_time)
  SELECT salon, s.staff_id, d.weekday, '09:00'::time, CASE WHEN d.weekday = 0 THEN '14:00' ELSE '18:00' END::time
  FROM (VALUES (staff_tom), (staff_jerry)) AS s(staff_id)
  CROSS JOIN generate_series(0, 6) AS d(weekday)
  WHERE NOT EXISTS (SELECT 1 FROM public.working_hours WHERE salon_id = salon);
END $$;