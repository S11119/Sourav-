-- Doodhwala WhatsApp agent · Supabase / Postgres schema
-- Run this in the Supabase SQL editor (or `psql "$SUPABASE_DB_URL" -f db/schema.sql`).
-- The app connects with the service-role key, which bypasses RLS, so no public
-- policies are defined on purpose: customers never touch these tables directly.

create extension if not exists pgcrypto;

create or replace function public.new_id(prefix text) returns text
language sql volatile as $$
  select prefix || replace(gen_random_uuid()::text, '-', '');
$$;

-- ---------------------------------------------------------------- products
create table if not exists public.products (
  id         text primary key default public.new_id('p_'),
  sku        text not null unique,
  name       text not null,
  name_hi    text not null,
  unit       text not null,
  price      numeric(10, 2) not null check (price >= 0),
  active     boolean not null default true
);

insert into public.products (id, sku, name, name_hi, unit, price, active) values
  ('p_cow',     'COW',     'Cow Milk',    'गाय का दूध',  'litre',  60, true),
  ('p_buffalo', 'BUFFALO', 'Buffalo Milk','भैंस का दूध', 'litre',  80, true),
  ('p_curd',    'CURD',    'Curd',        'दही',        'kg',    100, true),
  ('p_paneer',  'PANEER',  'Paneer',      'पनीर',       'kg',    400, true),
  ('p_ghee',    'GHEE',    'Desi Ghee',   'देसी घी',    'litre', 750, true),
  ('p_chaas',   'CHAAS',   'Buttermilk',  'छाछ',        'litre',  40, true)
on conflict (id) do nothing;

-- --------------------------------------------------------------- customers
create table if not exists public.customers (
  id         text primary key default public.new_id('c_'),
  wa_id      text not null unique,
  name       text,
  address    text,
  lang       text not null default 'hinglish' check (lang in ('hinglish', 'hindi', 'english')),
  notes      text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ orders
create table if not exists public.orders (
  id          text primary key default public.new_id('o_'),
  customer_id text not null references public.customers(id) on delete cascade,
  product_id  text not null references public.products(id),
  qty         numeric(10, 2) not null check (qty > 0),
  unit_price  numeric(10, 2) not null,
  frequency   text not null default 'daily' check (frequency in ('daily', 'alternate', 'weekly', 'once')),
  start_date  date not null,
  status      text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'completed')),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders (customer_id, status);

-- -------------------------------------------------------------- deliveries
create table if not exists public.deliveries (
  id          text primary key default public.new_id('d_'),
  order_id    text not null references public.orders(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  product_id  text not null references public.products(id),
  date        date not null,
  qty         numeric(10, 2) not null check (qty > 0),
  amount      numeric(10, 2) not null,
  status      text not null default 'scheduled' check (status in ('scheduled', 'delivered', 'paused', 'cancelled')),
  paid        boolean not null default false,
  unique (order_id, date)
);

create index if not exists deliveries_date_idx on public.deliveries (date, status);
create index if not exists deliveries_customer_idx on public.deliveries (customer_id, date);
create index if not exists deliveries_unpaid_idx on public.deliveries (paid) where paid = false;

-- ------------------------------------------------------------------ pauses
create table if not exists public.pauses (
  id          text primary key default public.new_id('pz_'),
  customer_id text not null references public.customers(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists pauses_customer_idx on public.pauses (customer_id, end_date);

-- ---------------------------------------------------------------- messages
create table if not exists public.messages (
  id          text primary key default public.new_id('m_'),
  customer_id text not null references public.customers(id) on delete cascade,
  direction   text not null check (direction in ('in', 'out')),
  body        text not null,
  intent      text,
  created_at  timestamptz not null default now()
);

create index if not exists messages_customer_idx on public.messages (customer_id, created_at);

-- -------------------------------------------------------------- complaints
create table if not exists public.complaints (
  id          text primary key default public.new_id('cp_'),
  customer_id text not null references public.customers(id) on delete cascade,
  kind        text not null default 'complaint' check (kind in ('complaint', 'handoff')),
  body        text not null,
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now()
);

create index if not exists complaints_status_idx on public.complaints (status, created_at);

-- ---------------------------------------------------------------- sessions
create table if not exists public.sessions (
  wa_id       text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  pending     jsonb,
  last_intent text,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- RLS
alter table public.products    enable row level security;
alter table public.customers   enable row level security;
alter table public.orders      enable row level security;
alter table public.deliveries  enable row level security;
alter table public.pauses      enable row level security;
alter table public.messages    enable row level security;
alter table public.complaints  enable row level security;
alter table public.sessions    enable row level security;
