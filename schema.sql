-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- Chaque utilisateur ne voit et ne modifie que ses propres données (Row Level Security).

create table if not exists public.settings (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  kcal_rest   int not null default 1900,
  kcal_sport  int not null default 2300,
  protein     int not null default 150,
  carbs_rest  int not null default 172,
  carbs_sport int not null default 272,
  fat         int not null default 68,
  updated_at  timestamptz not null default now()
);

create table if not exists public.days (
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  date     date not null,
  day_type text not null default 'repos' check (day_type in ('repos','sport')),
  primary key (user_id, date)
);

create table if not exists public.entries (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  date       date not null,
  meal       text not null check (meal in ('pdj','dej','col','din')),
  name       text not null check (char_length(name) <= 120),
  grams      numeric not null check (grams >= 0 and grams <= 5000),
  p100       numeric not null default 0,
  g100       numeric not null default 0,
  l100       numeric not null default 0,
  kcal100    numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists entries_user_date on public.entries (user_id, date);

create table if not exists public.weights (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date    date not null,
  kg      numeric(5,2) not null check (kg between 20 and 400),
  primary key (user_id, date)
);

create table if not exists public.custom_foods (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null check (char_length(name) <= 120),
  p100       numeric not null default 0,
  g100       numeric not null default 0,
  l100       numeric not null default 0,
  kcal100    numeric not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['settings','days','entries','weights','custom_foods'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
