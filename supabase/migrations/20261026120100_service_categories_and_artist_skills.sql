-- Services get an optional category so the booking page can group a long menu.
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category TEXT;

-- Demo salon: sort the menu into categories and record which artist offers which service.
DO $$
DECLARE
  salon uuid;
BEGIN
  SELECT id INTO salon FROM public.salons WHERE slug = 'tom-and-jerry-nails';
  IF salon IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.services s
  SET category = v.category
  FROM (VALUES
    ('Classic Manicure', 'Manicures'),
    ('Gel Manicure', 'Manicures'),
    ('Deluxe Spa Manicure', 'Manicures'),
    ('Dip Powder Manicure', 'Manicures'),
    ('Builder Gel Overlay', 'Manicures'),
    ('Polish Change', 'Manicures'),
    ('Spa Pedicure', 'Pedicures'),
    ('Gel Pedicure', 'Pedicures'),
    ('Acrylic Full Set', 'Extensions'),
    ('Acrylic Fill', 'Extensions'),
    ('Gel-X Extensions', 'Extensions'),
    ('Mani + Pedi Combo', 'Packages'),
    ('Kids'' Mani & Pedi', 'Packages'),
    ('Nail Art Add-On', 'Add-ons & extras'),
    ('Gel or Dip Removal', 'Add-ons & extras'),
    ('Paraffin Wax Treatment', 'Add-ons & extras')
  ) AS v(name, category)
  WHERE s.salon_id = salon AND s.name = v.name AND s.category IS NULL;

  -- Each artist offers whole categories plus a few individual services.
  INSERT INTO public.staff_services (staff_id, service_id, salon_id)
  SELECT st.id, sv.id, salon
  FROM (VALUES
    ('Tom', ARRAY['Manicures', 'Pedicures', 'Extensions', 'Packages', 'Add-ons & extras'], ARRAY[]::text[]),
    ('Linh', ARRAY['Manicures', 'Pedicures', 'Extensions', 'Packages', 'Add-ons & extras'], ARRAY[]::text[]),
    ('Jerry', ARRAY[]::text[], ARRAY['Classic Manicure', 'Gel Manicure', 'Polish Change', 'Nail Art Add-On', 'Gel-X Extensions', 'Gel or Dip Removal']),
    ('Mia', ARRAY['Manicures', 'Extensions'], ARRAY['Nail Art Add-On', 'Gel or Dip Removal']),
    ('Sofia', ARRAY['Pedicures', 'Packages'], ARRAY['Classic Manicure', 'Polish Change', 'Paraffin Wax Treatment', 'Gel or Dip Removal']),
    ('Ava', ARRAY['Extensions'], ARRAY['Gel Manicure', 'Dip Powder Manicure', 'Builder Gel Overlay', 'Nail Art Add-On', 'Gel or Dip Removal']),
    ('Daniel', ARRAY['Manicures', 'Pedicures', 'Packages'], ARRAY['Paraffin Wax Treatment', 'Gel or Dip Removal'])
  ) AS skill(staff_name, categories, service_names)
  JOIN public.staff st ON st.salon_id = salon AND st.name = skill.staff_name
  JOIN public.services sv ON sv.salon_id = salon
    AND (sv.category = ANY(skill.categories) OR sv.name = ANY(skill.service_names))
  ON CONFLICT (staff_id, service_id) DO NOTHING;
END $$;
