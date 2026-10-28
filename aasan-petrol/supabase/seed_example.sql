-- Optional: add stations after applying the migration. Replace with real, verified station details.
insert into public.stations (name, address, integration_level, is_active)
values
  ('Pilot Station A - replace with real station', 'Enter verified address', 'manual', true),
  ('Pilot Partner Station - integration to be confirmed', 'Enter verified address', 'partner', true);
