-- Fix infinite recursion: setlists ↔ share_links policies reference each other.
-- A SECURITY DEFINER function bypasses RLS, breaking the circular chain.

CREATE OR REPLACE FUNCTION public.is_setlist_owner(p_setlist_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = p_setlist_id AND s.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Drop the circular policies
DROP POLICY IF EXISTS "Setlist owner manages share links" ON public.share_links;
DROP POLICY IF EXISTS "Access follows setlist ownership" ON public.setlist_songs;
DROP POLICY IF EXISTS "Shared setlist songs are viewable" ON public.setlist_songs;
DROP POLICY IF EXISTS "Songs in shared setlists are viewable" ON public.songs;

-- Recreate share_links owner policy using the function (no recursion)
CREATE POLICY "Setlist owner manages share links"
  ON public.share_links FOR ALL
  USING (public.is_setlist_owner(setlist_id));

-- Recreate setlist_songs owner policy using the function
CREATE POLICY "Access follows setlist ownership"
  ON public.setlist_songs FOR ALL
  USING (public.is_setlist_owner(setlist_id));

-- Recreate shared read policies using the function
CREATE POLICY "Shared setlist songs are viewable"
  ON public.setlist_songs FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.share_links sl
      WHERE sl.setlist_id = setlist_songs.setlist_id
        AND sl.is_active = TRUE
        AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );

CREATE POLICY "Songs in shared setlists are viewable"
  ON public.songs FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.setlist_songs ss
      JOIN public.share_links sl ON sl.setlist_id = ss.setlist_id
      WHERE ss.song_id = songs.id
        AND sl.is_active = TRUE
        AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );
