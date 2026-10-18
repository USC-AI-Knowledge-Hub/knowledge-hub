# AI Team board: setup and moderation

The board at `/team` stores posts in a free Supabase database. There are no accounts: a visitor adds a
name, and their browser keeps a secret key that lets them edit or delete their own posts. Until the steps
below are done, the board still works, but each visitor only sees their own posts.

## One-time setup (about ten minutes)

1. Make a free project at [supabase.com](https://supabase.com) (any name, any region near your students).
2. Open **SQL editor**, paste all of `supabase/schema.sql`, and run it. You can run it again later; it only adds what is missing and replaces the functions with the newest versions.
   Then paste and run `supabase/blocked-words.sql` once for a starter block list (see below).
3. Open **Project settings → API** and copy two values: the **Project URL** and the **anon public** key.
   Both are meant to be public. The tables themselves can't be read or written from the browser; only the
   functions in the schema can, and they check every rule.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add:
   - `BOARD_URL`: the Project URL
   - `BOARD_ANON_KEY`: the anon public key
5. Run the **Daily videos and deploy** workflow once (Actions tab → Run workflow) so the site is rebuilt with them.

Check it: open `/team`, pick a tool, and the note about "isn't connected to the shared database" should be gone.

## What the rules are

- A post needs a name (1 to 40 characters) and text (1 to 2000). At most two links, and names can't hold links.
- Replies go one level deep.
- Rate limits: 5 posts in 10 minutes and 40 a day, per browser and per network address. (A one-way hash of the
  address is stored for this; the address itself is not.)
- Three different people reporting a post hides it until an editor looks.
- A post's author can edit or delete it, but only from the browser they wrote it in. Clearing the browser's site data loses that.

## Moderating

Use **Table editor** in Supabase, or run these in the **SQL editor**.

See what has been reported or hidden:

```sql
select p.id, p.board, p.topic, p.name, p.body, p.hidden, count(r.voter) as reports
from board_posts p left join board_reports r on r.post_id = p.id
group by p.id having count(r.voter) > 0 or p.hidden order by reports desc;
```

Bring a hidden post back, or remove one for good:

```sql
update board_posts set hidden = false where id = '<post id>';
delete from board_reports where post_id = '<post id>';   -- so it isn't hidden again by old reports
delete from board_posts where id = '<post id>';           -- removes the post and its replies
```

Hide a post yourself without deleting it: `update board_posts set hidden = true where id = '<post id>';`

### Block words

`supabase/blocked-words.sql` loads 1,255 English words and phrases into `board_blocked_words`. They come from the open-source
[cuss](https://github.com/words/cuss) package (MIT), using only the entries it rates "very likely profanity". GitHub, Meta and the other big
platforms don't publish their lists, and the lists that are public are broader and riskier than a board for students needs. Rebuild the file
with `npm run block-words`.

How it matches: a post or name is refused if it holds a blocked word or phrase as a whole word, after look-alikes are swapped back (`b@d`, `b4d`, `$`
for s, `0` for o). So "class" is fine when "ass" is blocked. It does not catch spacing tricks ("b a d"), other languages, or new slang, and
nothing like it ever will; the report button (three reports hide a post) is the backstop.

Edit the list in the **Table editor**, or in SQL (lower case):

```sql
insert into board_blocked_words values ('word one'), ('word two');
delete from board_blocked_words where word = 'something that blocked a real name';
```

Block someone who keeps posting: find one of their posts, then hide everything from the same browser:

```sql
update board_posts set hidden = true where voter = (select voter from board_posts where id = '<post id>');
```

## Deleting

A post's author can delete it from the browser they wrote it in. With no replies it is removed completely; with replies it stays as a short "deleted" stub so
the replies keep their place, and the stub goes when the last reply does. If you ran an earlier version of the schema, clear old stubs once:

```sql
delete from board_posts p where p.deleted and not exists (select 1 from board_posts c where c.parent_id = p.id);
```

## Changing things

- Boards (one per course, plus the tools board) and their topics are lists in `src/data/team.ts`. The database accepts any board or topic id written in lower-case letters, digits and hyphens, so adding a course needs no database change. Don't rename an id once posts use it.
- Reactions are the five in `board_react` (schema) and `REACTIONS` (`src/lib/board/rules.ts`). Change both together.
- Free Supabase projects pause after a week with no activity. Visiting the Supabase dashboard or any board traffic keeps it awake; if it ever pauses, restore it from the dashboard.
