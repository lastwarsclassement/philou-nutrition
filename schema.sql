-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- Plusieurs utilisateurs : chacun ne voit et ne modifie que ses propres données (Row Level Security).
-- Le script peut être relancé sans risque (il migre aussi l'ancienne version « sans connexion »).

-- Profil + consignes (une ligne par utilisateur)
create table if not exists public.settings (
  user_id     uuid primary key default auth.uid(),
  kcal_rest   int not null default 1900,
  kcal_sport  int not null default 2300,
  protein     int not null default 150,
  carbs_rest  int not null default 172,
  carbs_sport int not null default 272,
  fat         int not null default 68,
  updated_at  timestamptz not null default now()
);
alter table public.settings
  add column if not exists first_name   text check (char_length(first_name) <= 40),
  add column if not exists plan         text not null default 'custom' check (plan in ('philou','custom')),
  add column if not exists sex          text check (sex in ('H','F')),
  add column if not exists age          int check (age between 10 and 110),
  add column if not exists height_cm    int check (height_cm between 100 and 250),
  add column if not exists weight_start numeric(5,1) check (weight_start between 20 and 400),
  add column if not exists activity     numeric(3,2) check (activity between 1 and 2.5),
  add column if not exists sessions     int check (sessions between 0 and 14),
  add column if not exists maint_rest   int,
  add column if not exists maint_sport  int,
  add column if not exists created_at   timestamptz not null default now();

create table if not exists public.days (
  user_id  uuid not null default auth.uid(),
  date     date not null,
  day_type text not null default 'repos' check (day_type in ('repos','sport')),
  primary key (user_id, date)
);

create table if not exists public.entries (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid(),
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
  user_id uuid not null default auth.uid(),
  date    date not null,
  kg      numeric(5,2) not null check (kg between 20 and 400),
  primary key (user_id, date)
);

create table if not exists public.custom_foods (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid(),
  name       text not null check (char_length(name) <= 120),
  p100       numeric not null default 0,
  g100       numeric not null default 0,
  l100       numeric not null default 0,
  kcal100    numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Ancienne version sans connexion : ses lignes n'appartiennent à personne, on les retire
delete from public.settings     where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.days         where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.entries      where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.weights      where user_id = '00000000-0000-0000-0000-000000000001';
delete from public.custom_foods where user_id = '00000000-0000-0000-0000-000000000001';

do $$
declare t text;
begin
  foreach t in array array['settings','days','entries','weights','custom_foods'] loop
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);
    -- lien vers le compte : supprimer le compte supprime ses données
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_user_fk');
    execute format('alter table public.%I add constraint %I foreign key (user_id) references auth.users (id) on delete cascade', t, t || '_user_fk');
    -- chacun ne voit que ses lignes
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public access" on public.%I', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
