-- Mars: Last Colony: tighter security for friendships and profiles.
-- Run this once in Supabase → SQL Editor → New query → paste → Run. Safe to run more than once.

-- 1. Friend requests: only the person a request was sent to can update it, and only from 'pending' to 'accepted'.
drop policy if exists "accept requests sent to me" on public.friendships;
create policy "accept requests sent to me" on public.friendships for update to authenticated
  using (auth.uid() = addressee and status = 'pending')
  with check (auth.uid() = addressee and status = 'accepted');

-- 2. Only the status column can ever be updated (not who sent it, who received it, or when).
revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

-- 3. Belt and braces: refuse any change to the requester, the addressee or the creation time.
create or replace function public.friendships_lock_parties() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.requester is distinct from old.requester
     or new.addressee is distinct from old.addressee
     or new.created_at is distinct from old.created_at then
    raise exception 'The requester, addressee and creation time of a friendship cannot be changed';
  end if;
  return new;
end $$;
drop trigger if exists friendships_lock_parties on public.friendships;
create trigger friendships_lock_parties before update on public.friendships
  for each row execute function public.friendships_lock_parties();

-- 4. No duplicate friendships in the other direction (A→B when B→A already exists).
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- 5. Profiles: you can only change your own username and look (never the id).
revoke update on public.profiles from anon, authenticated;
grant update (username, look, updated_at) on public.profiles to authenticated;

-- 6. Presence: only your own row (the row-level policy already forces user_id = you), and only these columns.
revoke update on public.presence from anon, authenticated;
grant update (user_id, room_code, last_seen) on public.presence to authenticated;
