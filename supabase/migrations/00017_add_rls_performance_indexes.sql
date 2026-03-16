-- Indexes to speed up RLS policy EXISTS subqueries for shared access.
-- share_links(setlist_id) is used in setlist_songs and songs read policies.
-- setlist_songs(song_id) is used in the songs read policy reverse lookup.

CREATE INDEX IF NOT EXISTS idx_share_links_setlist_id_active
  ON share_links(setlist_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id
  ON setlist_songs(song_id);
