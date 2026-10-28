-- AASAN PETROL MVP database.
-- Run this whole file in Supabase SQL Editor using a project owner/admin account.
-- Never put the service_role key in the mobile app.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('employee', 'driver');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.approval_state as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.station_level as enum ('partner', 'manual');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tx_status as enum ('authorised', 'evidence_submitted', 'pending_review', 'verified', 'flagged', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.evidence_kind as enum ('meter_before', 'refuel_video', 'meter_after', 'receipt');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'employee',
  employer_name text,
  approval_status public.approval_state not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete restrict,
  registration_number text not null,
  make_model text,
  nickname text,
  is_active boolean not null default true,
  approved_by_employer boolean not null default false,
  created_at timestamptz not null default now(),
  unique (employee_id, registration_number)
);

create table if not exists public.driver_authorisations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  approval_status public.approval_state not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (employee_id, driver_id, vehicle_id)
);

create table if not exists public.allowances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  limit_amount_pkr numeric(12,2) not null check (limit_amount_pkr >= 0),
  remaining_amount_pkr numeric(12,2) not null check (remaining_amount_pkr >= 0),
  period_start date not null default date_trunc('month', now())::date,
  period_end date not null default (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (remaining_amount_pkr <= limit_amount_pkr)
);
create unique index if not exists allowances_one_active_per_employee on public.allowances(employee_id) where is_active;

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  integration_level public.station_level not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table if not exists public.fuel_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  employee_id uuid not null references public.profiles(id) on delete restrict,
  driver_id uuid not null references public.profiles(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  station_id uuid references public.stations(id) on delete set null,
  requested_amount_pkr numeric(12,2) not null check (requested_amount_pkr > 0),
  reported_litres numeric(10,3),
  status public.tx_status not null default 'authorised',
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  created_at timestamptz not null default now(),
  evidence_submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  check (reported_litres is null or reported_litres > 0)
);
create index if not exists fuel_transactions_employee_created on public.fuel_transactions(employee_id, created_at desc);
create index if not exists fuel_transactions_driver_created on public.fuel_transactions(driver_id, created_at desc);

create table if not exists public.transaction_evidence (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.fuel_transactions(id) on delete cascade,
  evidence_kind public.evidence_kind not null,
  storage_path text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  transaction_id uuid references public.fuel_transactions(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Create a profile after Supabase Auth signup. User metadata is untrusted input;
-- role is constrained to employee/driver, and approval always begins as pending.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, role, employer_name, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'role' = 'driver' then 'driver'::public.app_role else 'employee'::public.app_role end,
    nullif(new.raw_user_meta_data ->> 'employer_name', ''),
    'pending'::public.approval_state
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helpers used by RLS. They do not let a user approve their own account.
create or replace function public.is_approved_user(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p where p.id = p_user and p.approval_status = 'approved')
$$;

create or replace function public.can_access_transaction(p_tx uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.fuel_transactions t
    where t.id = p_tx and (t.employee_id = auth.uid() or t.driver_id = auth.uid())
  )
$$;

-- Driver request is recorded pending. Employer approval is deliberately external to the app.
create or replace function public.request_driver_authorisation(p_driver_email text, p_vehicle_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_driver uuid;
  v_employee uuid := auth.uid();
  v_vehicle public.vehicles%rowtype;
  v_id uuid;
begin
  if v_employee is null then raise exception 'Please log in first'; end if;
  if not public.is_approved_user(v_employee) then raise exception 'Your account is not approved'; end if;
  select * into v_vehicle from public.vehicles where id = p_vehicle_id and employee_id = v_employee and is_active = true;
  if not found then raise exception 'Vehicle not found or not owned by your account'; end if;
  select u.id into v_driver
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_driver_email)) and p.role = 'driver';
  if v_driver is null then raise exception 'No driver account found for that email. Ask the driver to register first.'; end if;
  insert into public.driver_authorisations(employee_id, driver_id, vehicle_id, approval_status)
  values(v_employee, v_driver, p_vehicle_id, 'pending')
  on conflict (employee_id, driver_id, vehicle_id) do update set approval_status = 'pending'
  returning id into v_id;
  insert into public.audit_events(actor_id, event_type, details)
  values(v_employee, 'driver_authorisation_requested', jsonb_build_object('request_id', v_id, 'vehicle_id', p_vehicle_id, 'driver_id', v_driver));
  return v_id;
end;
$$;

-- Authorise a transaction atomically. The allowance is RESERVED immediately so concurrent
-- requests cannot overspend it. If a transaction is cancelled, an admin process must release
-- the reservation; never let the mobile client edit balances directly.
create or replace function public.begin_refuel_transaction(
  p_vehicle_id uuid,
  p_station_id uuid,
  p_amount_pkr numeric,
  p_latitude double precision,
  p_longitude double precision,
  p_location_accuracy_m double precision
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_employee uuid;
  v_allowance public.allowances%rowtype;
  v_code text;
  v_tx uuid;
begin
  if v_actor is null then raise exception 'Please log in first'; end if;
  if p_amount_pkr is null or p_amount_pkr <= 0 then raise exception 'Enter an amount greater than zero'; end if;
  if not public.is_approved_user(v_actor) then raise exception 'Your account is awaiting employer approval'; end if;

  select employee_id into v_employee from public.vehicles
  where id = p_vehicle_id and is_active = true and approved_by_employer = true;
  if v_employee is null then raise exception 'Vehicle is not approved or active'; end if;

  if v_actor <> v_employee then
    if not exists (
      select 1 from public.driver_authorisations da
      where da.employee_id = v_employee and da.driver_id = v_actor
        and da.vehicle_id = p_vehicle_id and da.approval_status = 'approved'
    ) then raise exception 'You are not approved to refuel this vehicle'; end if;
  end if;

  if not exists (select 1 from public.profiles where id = v_employee and approval_status = 'approved') then
    raise exception 'Employee account is not approved';
  end if;

  if p_station_id is not null and not exists (select 1 from public.stations where id = p_station_id and is_active = true) then
    raise exception 'Selected station is not active';
  end if;

  -- Lock the active allowance row to prevent concurrent overspending.
  select * into v_allowance from public.allowances
  where employee_id = v_employee and is_active = true
  for update;
  if not found then raise exception 'No active allowance is assigned to this employee'; end if;
  if v_allowance.remaining_amount_pkr < p_amount_pkr then
    raise exception 'Insufficient allowance. Available PKR %', v_allowance.remaining_amount_pkr;
  end if;

  update public.allowances
    set remaining_amount_pkr = remaining_amount_pkr - p_amount_pkr
    where id = v_allowance.id;

  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
  insert into public.fuel_transactions(
    transaction_code, employee_id, driver_id, vehicle_id, station_id,
    requested_amount_pkr, status, latitude, longitude, location_accuracy_m
  ) values (
    v_code, v_employee, v_actor, p_vehicle_id, p_station_id,
    p_amount_pkr, 'authorised', p_latitude, p_longitude, p_location_accuracy_m
  ) returning id into v_tx;

  insert into public.audit_events(actor_id, transaction_id, event_type, details)
  values(v_actor, v_tx, 'refuel_authorised', jsonb_build_object('amount_pkr', p_amount_pkr, 'vehicle_id', p_vehicle_id, 'station_id', p_station_id));
  return v_tx;
end;
$$;

create or replace function public.submit_refuel_evidence(p_transaction_id uuid, p_reported_litres numeric)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid();
declare v_tx public.fuel_transactions%rowtype;
declare v_count integer;
begin
  select * into v_tx from public.fuel_transactions
  where id = p_transaction_id and (employee_id = v_actor or driver_id = v_actor)
  for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status <> 'authorised' then raise exception 'This transaction is no longer awaiting evidence'; end if;
  if p_reported_litres is not null and p_reported_litres <= 0 then raise exception 'Litres must be greater than zero'; end if;
  select count(*) into v_count from public.transaction_evidence where transaction_id = p_transaction_id;
  if v_count < 2 then raise exception 'Please upload at least the before and after meter photos'; end if;
  update public.fuel_transactions
    set reported_litres = p_reported_litres, status = 'pending_review', evidence_submitted_at = now()
    where id = p_transaction_id;
  insert into public.audit_events(actor_id, transaction_id, event_type, details)
  values(v_actor, p_transaction_id, 'evidence_submitted', jsonb_build_object('evidence_count', v_count, 'reported_litres', p_reported_litres));
  return true;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_authorisations enable row level security;
alter table public.allowances enable row level security;
alter table public.stations enable row level security;
alter table public.fuel_transactions enable row level security;
alter table public.transaction_evidence enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profile read self" on public.profiles;
create policy "profile read self" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profile update own limited fields" on public.profiles;
-- Do not allow client updates to role or approval_status. Profile editing can be added via a safe RPC later.

drop policy if exists "vehicle owner read" on public.vehicles;
create policy "vehicle owner read" on public.vehicles for select to authenticated using (employee_id = auth.uid() or exists(select 1 from public.driver_authorisations da where da.vehicle_id = vehicles.id and da.driver_id = auth.uid()));
drop policy if exists "employee inserts own vehicle" on public.vehicles;
create policy "employee inserts own vehicle" on public.vehicles for insert to authenticated with check (employee_id = auth.uid() and public.is_approved_user(auth.uid()) and approved_by_employer = false);
drop policy if exists "stations readable" on public.stations;
create policy "stations readable" on public.stations for select to authenticated using (is_active = true);

drop policy if exists "driver auth read involved" on public.driver_authorisations;
create policy "driver auth read involved" on public.driver_authorisations for select to authenticated using (employee_id = auth.uid() or driver_id = auth.uid());

drop policy if exists "allowance owner read" on public.allowances;
create policy "allowance owner read" on public.allowances for select to authenticated using (employee_id = auth.uid());

drop policy if exists "transaction participants read" on public.fuel_transactions;
create policy "transaction participants read" on public.fuel_transactions for select to authenticated using (employee_id = auth.uid() or driver_id = auth.uid());
-- No client insert/update/delete policy for transactions: all writes go through restricted RPCs.

drop policy if exists "evidence participant read" on public.transaction_evidence;
create policy "evidence participant read" on public.transaction_evidence for select to authenticated using (public.can_access_transaction(transaction_id));
drop policy if exists "evidence participant insert" on public.transaction_evidence;
create policy "evidence participant insert" on public.transaction_evidence for insert to authenticated with check (
  exists(select 1 from public.fuel_transactions t where t.id = transaction_id and (t.employee_id = auth.uid() or t.driver_id = auth.uid()) and t.status = 'authorised')
);
drop policy if exists "audit participant read" on public.audit_events;
create policy "audit participant read" on public.audit_events for select to authenticated using (
  actor_id = auth.uid() or (transaction_id is not null and public.can_access_transaction(transaction_id))
);

-- Private evidence bucket. Files are stored under {transaction_uuid}/filename.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fuel-evidence', 'fuel-evidence', false, 15000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;

drop policy if exists "evidence files upload by transaction participant" on storage.objects;
create policy "evidence files upload by transaction participant" on storage.objects for insert to authenticated with check (
  bucket_id = 'fuel-evidence'
  and exists (
    select 1 from public.fuel_transactions t
    where t.id::text = (storage.foldername(name))[1]
      and (t.employee_id = auth.uid() or t.driver_id = auth.uid())
      and t.status = 'authorised'
  )
);
drop policy if exists "evidence files read by transaction participant" on storage.objects;
create policy "evidence files read by transaction participant" on storage.objects for select to authenticated using (
  bucket_id = 'fuel-evidence'
  and exists (
    select 1 from public.fuel_transactions t
    where t.id::text = (storage.foldername(name))[1]
      and (t.employee_id = auth.uid() or t.driver_id = auth.uid())
  )
);

grant usage on schema public to authenticated;
grant select on public.profiles, public.vehicles, public.driver_authorisations, public.allowances, public.stations, public.fuel_transactions, public.transaction_evidence, public.audit_events to authenticated;
grant insert on public.vehicles, public.transaction_evidence to authenticated;
grant execute on function public.request_driver_authorisation(text, uuid) to authenticated;
grant execute on function public.begin_refuel_transaction(uuid, uuid, numeric, double precision, double precision, double precision) to authenticated;
grant execute on function public.submit_refuel_evidence(uuid, numeric) to authenticated;

-- IMPORTANT ADMIN SETUP:
-- Employer/admin approval and allowance assignment are deliberately performed outside the app.
-- Use Supabase SQL Editor with a trusted admin account to approve profiles, approve vehicles/
-- driver_authorisations, insert allowances, and add stations. Never expose the service role key.
