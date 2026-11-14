-- Mars: Last Colony: world invites (run this once, after supabase-setup.sql).
-- Supabase → SQL Editor → New query → paste → Run.
-- Players can only invite people they're friends with, and only see invites sent to or from them.

create table public.invites (
  id bigint generated always as identity primary key,
  sender uuid not null references public.profiles(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  room_code text not null check (room_code ~ '^[A-Z0-9]{5}$'),
  created_at timestamptz default now()
);
alter table public.invites enable row level security;
create policy "see invites to or from me" on public.invites for select to authenticated using (auth.uid() in (sender, recipient));
create policy "invite my friends" on public.invites for insert to authenticated with check (
  auth.uid() = sender and exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester = sender and f.addressee = recipient) or (f.addressee = sender and f.requester = recipient))));
create policy "delete invites to or from me" on public.invites for delete to authenticated using (auth.uid() in (sender, recipient));
