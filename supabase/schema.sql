-- Supabase schema for Writers Fund

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  pen_name text not null,
  email text not null,
  timezone text not null default 'UTC',
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  goals text not null,
  project_summary text not null,
  writing_sample text not null,
  created_at timestamptz not null default now()
);

create table if not exists tournaments (
  id uuid primary key,
  name text not null,
  season text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists passages (
  id uuid primary key,
  user_id uuid references profiles(id) on delete set null,
  kind text not null,
  title text not null,
  content text not null,
  genre text not null,
  status text not null,
  narrative text,
  word_count integer,
  parent_passage_id uuid references passages(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists matchups (
  id uuid primary key,
  tournament_id uuid not null references tournaments(id) on delete cascade,
  writer_passage_id uuid not null references passages(id),
  ai_passage_id uuid not null references passages(id),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null
);

create table if not exists ballots (
  id uuid primary key,
  matchup_id uuid not null references matchups(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  option_a uuid not null references passages(id),
  option_b uuid not null references passages(id),
  created_at timestamptz not null default now(),
  unique (matchup_id, voter_id)
);

create table if not exists votes (
  id uuid primary key,
  event_id uuid not null unique,
  matchup_id uuid not null references matchups(id) on delete cascade,
  ballot_id uuid not null references ballots(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  choice text not null,
  winner_passage_id uuid not null references passages(id),
  feedback text not null,
  trust_weight real not null default 1,
  created_at timestamptz not null default now(),
  unique (voter_id, matchup_id)
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, pen_name, email, timezone, bio)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'pen_name', ''), nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'timezone', ''), 'UTC'),
    coalesce(new.raw_user_meta_data->>'bio', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS policies
alter table profiles enable row level security;
alter table applications enable row level security;
alter table tournaments enable row level security;
alter table passages enable row level security;
alter table matchups enable row level security;
alter table ballots enable row level security;
alter table votes enable row level security;

create policy "Profiles readable" on profiles
  for select
  using (auth.role() = 'authenticated');

create policy "Profiles update own" on profiles
  for update
  using (auth.uid() = id);

create policy "Applications insert own" on applications
  for insert
  with check (auth.uid() = user_id);

create policy "Applications read own" on applications
  for select
  using (auth.uid() = user_id);

create policy "Tournaments readable" on tournaments
  for select
  using (auth.role() = 'authenticated');

create policy "Passages readable" on passages
  for select
  using (auth.role() = 'authenticated');

create policy "Passages insert" on passages
  for insert
  with check (auth.role() = 'authenticated');

create policy "Matchups readable" on matchups
  for select
  using (auth.role() = 'authenticated');

create policy "Matchups insert" on matchups
  for insert
  with check (auth.role() = 'authenticated');

create policy "Ballots readable" on ballots
  for select
  using (auth.role() = 'authenticated');

create policy "Ballots insert own" on ballots
  for insert
  with check (auth.uid() = voter_id);

create policy "Votes readable" on votes
  for select
  using (auth.role() = 'authenticated');

create policy "Votes insert own" on votes
  for insert
  with check (auth.uid() = voter_id);
