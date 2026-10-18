-- AI Team discussion board. Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run again: it only creates what is missing and replaces the functions.
--
-- How it is locked down: nobody can read or write the tables directly. The site reads the
-- `board_public` view (which leaves out edit keys, voter ids and hidden posts) and writes only through
-- the board_* functions below, which check every rule. No sign-in: a browser proves a post is its
-- own with a secret key it made when posting, and only the key's hash is stored.

create table if not exists board_posts (
  id uuid primary key default gen_random_uuid(),
  board text not null check (board ~ '^[a-z0-9-]{1,40}$'),
  topic text not null check (topic ~ '^[a-z0-9-]{1,40}$'),
  parent_id uuid references board_posts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  body text not null check (char_length(body) <= 2000),
  key_hash text not null,
  voter text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted boolean not null default false,
  hidden boolean not null default false
);
create index if not exists board_posts_board on board_posts (board, topic, created_at);
create index if not exists board_posts_parent on board_posts (parent_id);
create index if not exists board_posts_voter on board_posts (voter, created_at);
create index if not exists board_posts_ip on board_posts (ip_hash, created_at);

create table if not exists board_reactions (
  post_id uuid not null references board_posts(id) on delete cascade,
  voter text not null,
  emoji text not null,
  primary key (post_id, voter, emoji)
);

create table if not exists board_reports (
  post_id uuid not null references board_posts(id) on delete cascade,
  voter text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, voter)
);

-- Words that stop a post or a name. Empty on purpose: the editors add their own in the Table editor.
create table if not exists board_blocked_words (word text primary key check (word = lower(word)));

-- What the site reads. Hidden posts are left out; deleted posts keep their place but lose their text.
create or replace view board_public as
select
  p.id, p.board, p.topic, p.parent_id,
  case when p.deleted then 'deleted' else p.name end as name,
  case when p.deleted then '' else p.body end as body,
  p.created_at, p.edited_at, p.deleted,
  coalesce((select jsonb_object_agg(r.emoji, r.n) from (select emoji, count(*) as n from board_reactions where post_id = p.id group by emoji) r), '{}'::jsonb) as reactions
from board_posts p
where not p.hidden;

alter table board_posts enable row level security;
alter table board_reactions enable row level security;
alter table board_reports enable row level security;
alter table board_blocked_words enable row level security;

create or replace function board_hash(k text) returns text language sql immutable as $$
  select encode(sha256(convert_to(coalesce(k, ''), 'utf8')), 'hex')
$$;

create or replace function board_clean(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(coalesce(t, ''), '[\u0000-\u0008\u000B\u000C\u000E-\u001F]', '', 'g'), '\r\n?', E'\n', 'g'))
$$;

-- Lower case, with the usual look-alikes swapped back to letters (0 for o, @ for a, $ for s ...).
create or replace function board_norm(t text) returns text language sql immutable as $$
  select translate(lower(coalesce(t, '')), '013457$@', 'oieastsa')
$$;

-- Whether the text holds a blocked word or phrase as a whole word, so "class" is fine when "ass" is blocked.
create or replace function board_has_blocked(t text) returns boolean language sql stable as $$
  select exists (
    select 1 from board_blocked_words w
    where board_norm(t) ~ ('(^|[^a-z])' || regexp_replace(board_norm(w.word), '([.*+?^$(){}|\[\]\\])', '\\\1', 'g') || '([^a-z]|$)')
  )
$$;

create or replace function board_ip() returns text language plpgsql stable as $$
declare h text; begin
  begin h := current_setting('request.headers', true)::json ->> 'x-forwarded-for'; exception when others then h := null; end;
  if h is null or h = '' then return null; end if;
  return board_hash(btrim(split_part(h, ',', 1)));
end $$;

-- Post a topic (no parent) or a reply (parent given). Returns the new post's id.
create or replace function board_post(p_board text, p_topic text, p_parent uuid, p_name text, p_body text, p_key text, p_voter text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_name text := board_clean(p_name); v_body text := board_clean(p_body); v_ip text := board_ip(); v_parent board_posts; v_id uuid;
begin
  if p_board !~ '^[a-z0-9-]{1,40}$' or p_topic !~ '^[a-z0-9-]{1,40}$' then raise exception 'That board does not exist.'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then raise exception 'Use a name of 1 to 40 characters.'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'Write between 1 and 2000 characters.'; end if;
  if coalesce(char_length(p_key), 0) < 16 or coalesce(char_length(p_voter), 0) < 16 then raise exception 'Something went wrong. Reload the page and try again.'; end if;
  if v_name ~* '(https?://|www\.)' then raise exception 'Names can''t contain links.'; end if;
  if (select count(*) from regexp_matches(v_body, '(https?://|www\.)', 'gi')) > 2 then raise exception 'Use at most two links in a post.'; end if;
  if board_has_blocked(v_name) or board_has_blocked(v_body) then raise exception 'That post can''t be shared. Please reword it.'; end if;
  if (select count(*) from board_posts where created_at > now() - interval '10 minutes' and (voter = p_voter or (v_ip is not null and ip_hash = v_ip))) >= 5
     or (select count(*) from board_posts where created_at > now() - interval '1 day' and (voter = p_voter or (v_ip is not null and ip_hash = v_ip))) >= 40
  then raise exception 'You''re posting quickly. Try again in a few minutes.'; end if;
  if p_parent is not null then
    select * into v_parent from board_posts where id = p_parent and not hidden and not deleted;
    if not found then raise exception 'That post is gone, so it can''t be replied to.'; end if;
    if v_parent.parent_id is not null then raise exception 'Reply to the original post instead.'; end if;
    if v_parent.board <> p_board or v_parent.topic <> p_topic then raise exception 'That reply is on a different board.'; end if;
  end if;
  insert into board_posts (board, topic, parent_id, name, body, key_hash, voter, ip_hash)
  values (p_board, p_topic, p_parent, v_name, v_body, board_hash(p_key), p_voter, v_ip) returning id into v_id;
  return v_id;
end $$;

create or replace function board_edit(p_id uuid, p_key text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_body text := board_clean(p_body);
begin
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'Write between 1 and 2000 characters.'; end if;
  if board_has_blocked(v_body) then raise exception 'That post can''t be shared. Please reword it.'; end if;
  update board_posts set body = v_body, edited_at = now() where id = p_id and key_hash = board_hash(p_key) and not deleted;
  if not found then raise exception 'You can only edit your own posts, in the browser you wrote them in.'; end if;
end $$;

-- Delete your own post. With no replies it is removed outright; a post that has replies stays as a stub so they keep
-- their place. Deleting the last reply also clears a stub left behind by its deleted parent.
create or replace function board_delete(p_id uuid, p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare v board_posts;
begin
  select * into v from board_posts where id = p_id and key_hash = board_hash(p_key);
  if not found then raise exception 'You can only delete your own posts, in the browser you wrote them in.'; end if;
  if exists (select 1 from board_posts where parent_id = p_id) then
    update board_posts set deleted = true, body = '' where id = p_id;
  else
    delete from board_posts where id = p_id;
    if v.parent_id is not null then
      delete from board_posts where id = v.parent_id and deleted and not exists (select 1 from board_posts where parent_id = v.parent_id);
    end if;
  end if;
end $$;

-- Add the reaction, or take it back if this voter already gave it. Returns true when it is now on.
create or replace function board_react(p_id uuid, p_voter text, p_emoji text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_emoji not in ('👍', '❤️', '💡', '🎉', '🤔') then raise exception 'That reaction isn''t available.'; end if;
  if coalesce(char_length(p_voter), 0) < 16 then raise exception 'Something went wrong. Reload the page and try again.'; end if;
  if not exists (select 1 from board_posts where id = p_id and not hidden and not deleted) then raise exception 'That post is gone.'; end if;
  delete from board_reactions where post_id = p_id and voter = p_voter and emoji = p_emoji;
  if found then return false; end if;
  insert into board_reactions (post_id, voter, emoji) values (p_id, p_voter, p_emoji);
  return true;
end $$;

-- Three different people reporting a post hides it until an editor looks at it.
create or replace function board_report(p_id uuid, p_voter text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(char_length(p_voter), 0) < 16 then raise exception 'Something went wrong. Reload the page and try again.'; end if;
  if not exists (select 1 from board_posts where id = p_id) then raise exception 'That post is gone.'; end if;
  insert into board_reports (post_id, voter) values (p_id, p_voter) on conflict do nothing;
  if (select count(*) from board_reports where post_id = p_id) >= 3 then update board_posts set hidden = true where id = p_id; end if;
end $$;

-- The helpers are for the functions below, not for the site to call.
revoke execute on function board_hash(text), board_clean(text), board_norm(text), board_has_blocked(text), board_ip() from public;

-- Lock the tables and open only the view and the functions to the site (skipped where there is no "anon" role).
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on board_posts, board_reactions, board_reports, board_blocked_words from anon, authenticated;
    grant select on board_public to anon, authenticated;
    grant execute on function board_post(text, text, uuid, text, text, text, text), board_edit(uuid, text, text), board_delete(uuid, text),
      board_react(uuid, text, text), board_report(uuid, text) to anon, authenticated;
  end if;
end $$;
