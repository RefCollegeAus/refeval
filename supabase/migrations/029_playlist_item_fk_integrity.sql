-- ============================================================
-- Fix: clip_playlist_items can survive deletion of its referenced
-- review or clip, producing a stale item that the assignment list
-- still counts but the assignment detail view cannot resolve.
--
-- Symptom this fixes: an assignment shows "N clips" in the My
-- Learning list, but opening it resolves fewer than N (or zero)
-- clips in LearningAssignmentRunner, because that view silently
-- skips any playlist item whose review or clip no longer exists
-- (`if (!review || !tag) continue;`).
--
-- Root cause: clip_playlist_items.review_id and .tag_id are plain
-- `uuid not null` columns with NO foreign key at all (confirmed via
-- 011_playlists.sql, and independently via the generated
-- lib/supabase/database.types.ts Relationships array, which lists
-- only the playlist_id -> clip_playlists FK).
--
-- Confirmed relationships (from the actual playlist-creation code,
-- components/admin/ClipLibraryScreen.tsx: `{ reviewId: row.review.id,
-- tagId: row.tag.id }`, where row.tag is a `clips` row — the app
-- calls a clips row a "tag" everywhere, e.g. the CodedTag type):
--   clip_playlist_items.review_id -> reviews.id
--   clip_playlist_items.tag_id    -> clips.id
--
-- A playlist item is only meaningful while BOTH its review and its
-- specific clip still exist, so it must be removed if EITHER
-- reference is invalid — not just one or the other. Deleting a
-- review already cascades to delete its clips (clips.review_id
-- references reviews(id) on delete cascade, from 001_initial_schema),
-- so a single ON DELETE CASCADE FK on tag_id would be sufficient in
-- practice, but both FKs are added for defence in depth in case a
-- row is ever inserted where the two references disagree.
--
-- No RLS changes — cpi_select/cpi_insert/cpi_update/cpi_delete
-- (011_playlists.sql, 016_playlist_learner_rls.sql) are untouched.
-- ============================================================

-- ── Step 1: remove existing orphaned rows ─────────────────────────────────────
-- Safe to run repeatedly — deletes only rows whose review_id or tag_id no
-- longer resolves to a real row. Nothing to delete once orphans are gone.

delete from public.clip_playlist_items cpi
where not exists (select 1 from public.reviews r where r.id = cpi.review_id)
   or not exists (select 1 from public.clips   c where c.id = cpi.tag_id);

-- ── Step 2: add the missing foreign keys, ON DELETE CASCADE ──────────────────
-- Idempotent: drop-if-exists then add, safe to run more than once.

alter table public.clip_playlist_items
  drop constraint if exists clip_playlist_items_review_id_fkey;

alter table public.clip_playlist_items
  add constraint clip_playlist_items_review_id_fkey
  foreign key (review_id) references public.reviews(id) on delete cascade;

alter table public.clip_playlist_items
  drop constraint if exists clip_playlist_items_tag_id_fkey;

alter table public.clip_playlist_items
  add constraint clip_playlist_items_tag_id_fkey
  foreign key (tag_id) references public.clips(id) on delete cascade;
