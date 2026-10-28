-- AASAN PETROL HCI update: wallet top-up requests, shop purchases, and OCR records.
-- Safe to run after 001_initial_schema.sql. This migration does not credit a wallet
-- when a user requests a top-up; an employer/admin must review it separately.

alter table public.fuel_transactions
  add column if not exists transaction_category text not null default 'fuel',
  add column if not exists transaction_details jsonb not null default '{}'::jsonb;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fuel_transactions_category_check'
      and conrelid = 'public.fuel_transactions'::regclass
  ) then
    alter table public.fuel_transactions
      add constraint fuel_transactions_category_check
      check (transaction_category in ('fuel', 'shop'));
  end if;
end $$;

create table if not exists public.wallet_topup_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  requested_amount_pkr numeric(12,2) not null check (requested_amount_pkr > 0),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists wallet_topup_requests_user_created
  on public.wallet_topup_requests(requested_by, created_at desc);

create table if not exists public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.fuel_transactions(id) on delete cascade,
  source_image_path text not null,
  raw_ocr_text text not null default '',
  extracted_amount_pkr numeric(12,2),
  extracted_litres numeric(10,3),
  extracted_unit_price_pkr_per_litre numeric(10,3),
  user_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  check (extracted_amount_pkr is null or extracted_amount_pkr >= 0),
  check (extracted_litres is null or extracted_litres >= 0),
  check (extracted_unit_price_pkr_per_litre is null or extracted_unit_price_pkr_per_litre >= 0)
);
create index if not exists meter_readings_transaction_created
  on public.meter_readings(transaction_id, created_at desc);

create table if not exists public.shop_catalog (
  id text primary key,
  name text not null,
  price_pkr numeric(12,2) not null check (price_pkr >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.shop_catalog(id, name, price_pkr, is_active) values
  ('water', 'Mineral water', 100, true),
  ('tea', 'Chai / hot tea', 80, true),
  ('drink', 'Cold drink', 120, true),
  ('snacks', 'Biscuits / chips', 60, true),
  ('oil', 'Engine oil (1L)', 950, true)
on conflict (id) do nothing;

alter table public.wallet_topup_requests enable row level security;
alter table public.meter_readings enable row level security;
alter table public.shop_catalog enable row level security;

-- Drivers may read the allowance and vehicles for which the employer has approved them.
drop policy if exists "allowance owner read" on public.allowances;
create policy "allowance owner read" on public.allowances for select to authenticated using (
  employee_id = auth.uid()
  or exists (
    select 1 from public.driver_authorisations da
    where da.employee_id = allowances.employee_id
      and da.driver_id = auth.uid()
      and da.approval_status = 'approved'
  )
);
drop policy if exists "vehicle owner read" on public.vehicles;
create policy "vehicle owner read" on public.vehicles for select to authenticated using (
  employee_id = auth.uid()
  or exists (
    select 1 from public.driver_authorisations da
    where da.vehicle_id = vehicles.id
      and da.driver_id = auth.uid()
      and da.approval_status = 'approved'
  )
);

drop policy if exists "topup requests read own" on public.wallet_topup_requests;
create policy "topup requests read own" on public.wallet_topup_requests
  for select to authenticated using (requested_by = auth.uid() or employee_id = auth.uid());
-- Inserts go through a trusted RPC so a driver request is tied to an employer allowance.
-- No client update/delete policy: approvals and rejections are trusted admin actions.

drop policy if exists "meter readings read transaction participants" on public.meter_readings;
create policy "meter readings read transaction participants" on public.meter_readings
  for select to authenticated using (public.can_access_transaction(transaction_id));
drop policy if exists "meter readings add during authorised transaction" on public.meter_readings;
create policy "meter readings add during authorised transaction" on public.meter_readings
  for insert to authenticated with check (
    exists (
      select 1 from public.fuel_transactions t
      where t.id = transaction_id
        and (t.employee_id = auth.uid() or t.driver_id = auth.uid())
        and t.status = 'authorised'
    )
  );

grant select on public.wallet_topup_requests to authenticated;
grant select, insert on public.meter_readings to authenticated;

drop policy if exists "active shop catalog readable" on public.shop_catalog;
create policy "active shop catalog readable" on public.shop_catalog for select to authenticated using (is_active = true);
grant select on public.shop_catalog to authenticated;


create or replace function public.request_wallet_topup(
  p_amount_pkr numeric,
  p_note text,
  p_vehicle_id uuid
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_employee uuid;
  v_request uuid;
begin
  if v_actor is null then raise exception 'Please log in first'; end if;
  if p_amount_pkr is null or p_amount_pkr <= 0 then raise exception 'Enter an amount greater than zero'; end if;
  if not public.is_approved_user(v_actor) then raise exception 'Your account is awaiting employer approval'; end if;
  select role into v_role from public.profiles where id = v_actor;
  if v_role = 'employee' then
    v_employee := v_actor;
    if p_vehicle_id is not null and not exists (
      select 1 from public.vehicles v where v.id = p_vehicle_id and v.employee_id = v_actor and v.is_active = true
    ) then raise exception 'Vehicle not found for this employee'; end if;
  else
    if p_vehicle_id is null then raise exception 'Choose your approved vehicle for the top-up request'; end if;
    select v.employee_id into v_employee
    from public.vehicles v
    join public.driver_authorisations da on da.vehicle_id = v.id
    where v.id = p_vehicle_id and v.is_active = true and v.approved_by_employer = true
      and da.driver_id = v_actor and da.approval_status = 'approved';
    if v_employee is null then raise exception 'You are not approved to request allowance for this vehicle'; end if;
  end if;
  if not exists (select 1 from public.profiles where id = v_employee and approval_status = 'approved') then
    raise exception 'Employee account is not approved';
  end if;
  if not exists (select 1 from public.allowances where employee_id = v_employee and is_active = true) then
    raise exception 'No active allowance is assigned to this employee';
  end if;
  insert into public.wallet_topup_requests(requested_by, employee_id, vehicle_id, requested_amount_pkr, note)
  values(v_actor, v_employee, p_vehicle_id, p_amount_pkr, nullif(trim(p_note), ''))
  returning id into v_request;
  insert into public.audit_events(actor_id, event_type, details)
  values(v_actor, 'wallet_topup_requested', jsonb_build_object('request_id', v_request, 'employee_id', v_employee, 'amount_pkr', p_amount_pkr));
  return v_request;
end;
$$;

grant execute on function public.request_wallet_topup(numeric, text, uuid) to authenticated;

create or replace function public.begin_shop_purchase(
  p_vehicle_id uuid,
  p_station_id uuid,
  p_amount_pkr numeric,
  p_latitude double precision,
  p_longitude double precision,
  p_location_accuracy_m double precision,
  p_items jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_employee uuid;
  v_allowance public.allowances%rowtype;
  v_code text;
  v_tx uuid;
  v_item jsonb;
  v_item_id text;
  v_qty integer;
  v_item_name text;
  v_item_price numeric(12,2);
  v_calculated_total numeric(12,2) := 0;
  v_verified_items jsonb := '[]'::jsonb;
begin
  if v_actor is null then raise exception 'Please log in first'; end if;
  if p_amount_pkr is null or p_amount_pkr <= 0 then raise exception 'Select at least one shop item'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Cart is invalid'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  -- Recalculate every line using server-side catalog prices; never trust client prices.
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_item_id := v_item ->> 'id';
    if coalesce(v_item ->> 'qty', '') !~ '^[1-9][0-9]{0,3}$' then raise exception 'Invalid item quantity'; end if;
    v_qty := (v_item ->> 'qty')::integer;
    select name, price_pkr into v_item_name, v_item_price
      from public.shop_catalog where id = v_item_id and is_active = true;
    if not found then raise exception 'A shop item is no longer available'; end if;
    v_calculated_total := v_calculated_total + (v_item_price * v_qty);
    v_verified_items := v_verified_items || jsonb_build_array(jsonb_build_object(
      'id', v_item_id, 'name', v_item_name, 'price', v_item_price, 'qty', v_qty
    ));
  end loop;
  if v_calculated_total <> p_amount_pkr then raise exception 'Cart total changed. Refresh the items and try again'; end if;
  if not public.is_approved_user(v_actor) then raise exception 'Your account is awaiting employer approval'; end if;

  select employee_id into v_employee from public.vehicles
  where id = p_vehicle_id and is_active = true and approved_by_employer = true;
  if v_employee is null then raise exception 'Vehicle is not approved or active'; end if;

  if v_actor <> v_employee and not exists (
    select 1 from public.driver_authorisations da
    where da.employee_id = v_employee and da.driver_id = v_actor
      and da.vehicle_id = p_vehicle_id and da.approval_status = 'approved'
  ) then raise exception 'You are not approved to use this vehicle'; end if;

  if not exists (select 1 from public.profiles where id = v_employee and approval_status = 'approved') then
    raise exception 'Employee account is not approved';
  end if;
  if p_station_id is not null and not exists (select 1 from public.stations where id = p_station_id and is_active = true) then
    raise exception 'Selected station is not active';
  end if;

  select * into v_allowance from public.allowances
  where employee_id = v_employee and is_active = true
  for update;
  if not found then raise exception 'No active allowance is assigned to this employee'; end if;
  if v_allowance.remaining_amount_pkr < p_amount_pkr then
    raise exception 'Insufficient allowance. Available PKR %', v_allowance.remaining_amount_pkr;
  end if;

  update public.allowances set remaining_amount_pkr = remaining_amount_pkr - p_amount_pkr
  where id = v_allowance.id;

  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
  insert into public.fuel_transactions(
    transaction_code, employee_id, driver_id, vehicle_id, station_id,
    requested_amount_pkr, status, latitude, longitude, location_accuracy_m,
    transaction_category, transaction_details
  ) values (
    v_code, v_employee, v_actor, p_vehicle_id, p_station_id,
    p_amount_pkr, 'pending_review', p_latitude, p_longitude, p_location_accuracy_m,
    'shop', jsonb_build_object('items', v_verified_items)
  ) returning id into v_tx;

  insert into public.audit_events(actor_id, transaction_id, event_type, details)
  values(v_actor, v_tx, 'shop_purchase_recorded', jsonb_build_object('amount_pkr', p_amount_pkr, 'items', v_verified_items));
  return v_tx;
end;
$$;

grant execute on function public.begin_shop_purchase(uuid, uuid, numeric, double precision, double precision, double precision, jsonb) to authenticated;
