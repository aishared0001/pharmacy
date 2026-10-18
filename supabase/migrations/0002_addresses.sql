-- ===========================================================================
-- MediGo - saved customer addresses
-- Lets a customer store delivery addresses and reuse them at checkout.
-- Apply after 0001_init.sql.
-- ===========================================================================

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  landmark text,
  city text not null default 'Chandigarh',
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_idx
  on public.addresses (user_id, is_default desc, created_at desc);

alter table public.addresses enable row level security;

-- A customer can only see and manage their own saved addresses.
drop policy if exists "addresses owner all" on public.addresses;
create policy "addresses owner all" on public.addresses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
