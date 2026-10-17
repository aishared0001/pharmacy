-- ===========================================================================
-- MediGo - Chandigarh pharmacy delivery
-- Schema + Row Level Security + Chandigarh delivery-area enforcement.
-- Apply this in the Supabase SQL editor (or `supabase db push`).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  brand text,
  manufacturer text,
  category_id uuid not null references public.categories (id) on delete restrict,
  price numeric(10, 2) not null check (price >= 0),
  mrp numeric(10, 2) not null check (mrp >= 0),
  pack_size text,
  prescription_required boolean not null default false,
  in_stock boolean not null default true,
  -- Drives the bundled product illustration when image_url is null.
  -- One of: tablet, capsule, syrup, drops, tube, injection, sachet, spray,
  -- inhaler, device, generic.
  form text not null default 'generic',
  image_url text,
  description text,
  uses text,
  side_effects text,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_name_idx on public.products (lower(name));

-- Delivery area rule kept in the DB so it cannot be bypassed by the client.
create or replace function public.is_chandigarh_pincode(p text)
returns boolean
language sql
immutable
as $$
  select p ~ '^[0-9]{6}$'
     and p >= '160001' and p <= '160104';
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'placed'
    check (status in ('placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  landmark text,
  city text not null default 'Chandigarh',
  pincode text not null
    check (pincode ~ '^[0-9]{6}$' and pincode >= '160001' and pincode <= '160104'),
  prescription_url text,
  payment_method text not null default 'COD' check (payment_method = 'COD'),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profile row automatically on sign-up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies to check admin status without recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles: a user reads/updates only their own row. is_admin is protected by
-- a trigger below so users cannot escalate themselves.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Prevent a non-admin from setting is_admin = true on their own row.
create or replace function public.guard_profile_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'Not allowed to change admin status';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin on public.profiles;
create trigger profiles_guard_admin
  before update on public.profiles
  for each row execute function public.guard_profile_admin();

-- categories & products: public (authenticated) read, admin write.
drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories
  for select using (true);

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products read" on public.products;
create policy "products read" on public.products
  for select using (true);

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: a user inserts/reads their own; admins read all.
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders read own" on public.orders;
create policy "orders read own" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- order_items: readable/insertable by the owner of the parent order; admins all.
drop policy if exists "order_items insert own" on public.order_items;
create policy "order_items insert own" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items read own" on public.order_items;
create policy "order_items read own" on public.order_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- prescriptions: a user manages files under a folder named by their uid.
drop policy if exists "rx upload own" on storage.objects;
create policy "rx upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "rx read own" on storage.objects;
create policy "rx read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prescriptions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- product-images: public read, admin write.
drop policy if exists "product images read" on storage.objects;
create policy "product images read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
