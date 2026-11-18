-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- Site sans connexion : toutes les lignes appartiennent à un propriétaire fixe et sont
-- lisibles/modifiables avec la clé publique (anon / publishable).

create table if not exists public.settings (
  user_id     uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  kcal_rest   int not null default 1900,
  kcal_sport  int not null default 2300,
  protein     int not null default 150,
  carbs_rest  int not null default 172,
  carbs_sport int not null default 272,
  fat         int not null default 68,
  updated_at  timestamptz not null default now()
);

create table if not exists public.days (
  user_id  uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  date     date not null,
  day_type text not null default 'repos' check (day_type in ('repos','sport')),
  primary key (user_id, date)
);

create table if not exists public.entries (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
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
  user_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  date    date not null,
  kg      numeric(5,2) not null check (kg between 20 and 400),
  primary key (user_id, date)
);

create table if not exists public.custom_foods (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  name       text not null check (char_length(name) <= 120),
  p100       numeric not null default 0,
  g100       numeric not null default 0,
  l100       numeric not null default 0,
  kcal100    numeric not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare t text; c text;
begin
  foreach t in array array['settings','days','entries','weights','custom_foods'] loop
    -- (migration depuis la version avec connexion : retire le lien vers auth.users)
    for c in select conname from pg_constraint where conrelid = ('public.' || t)::regclass and contype = 'f' loop
      execute format('alter table public.%I drop constraint %I', t, c);
    end loop;
    execute format('alter table public.%I alter column user_id set default ''00000000-0000-0000-0000-000000000001''::uuid', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('drop policy if exists "public access" on public.%I', t);
    execute format('create policy "public access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;
