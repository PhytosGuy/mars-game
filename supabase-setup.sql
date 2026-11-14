-- Mars: Last Colony: accounts, friends and online status.
-- Paste all of this into Supabase → SQL Editor → New query, then press Run.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  look jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
create policy "see own friendships" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy "send requests" on public.friendships for insert to authenticated with check (auth.uid() = requester and status = 'pending');
create policy "accept requests sent to me" on public.friendships for update to authenticated using (auth.uid() = addressee) with check (auth.uid() = addressee and status = 'accepted');
create policy "remove friendships" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

create table public.presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  room_code text,
  last_seen timestamptz default now()
);
alter table public.presence enable row level security;
create policy "friends see presence" on public.presence for select to authenticated using (
  user_id = auth.uid() or exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = presence.user_id)
        or (f.addressee = auth.uid() and f.requester = presence.user_id))));
create policy "insert own presence" on public.presence for insert to authenticated with check (user_id = auth.uid());
create policy "update own presence" on public.presence for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
