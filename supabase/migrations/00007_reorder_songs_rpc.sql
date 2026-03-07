-- RPC function to reorder songs in a single transaction.
-- The DEFERRABLE INITIALLY DEFERRED constraint on (setlist_id, position)
-- only works within a single transaction. The Supabase JS client sends
-- each .update() as a separate HTTP request (separate transaction), so
-- intermediate states can violate the unique constraint. This function
-- wraps all position updates in one transaction.

CREATE OR REPLACE FUNCTION public.reorder_setlist_songs(
  p_setlist_id UUID,
  p_song_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  i INT;
BEGIN
  -- Verify the caller owns the setlist
  IF NOT EXISTS (
    SELECT 1 FROM public.setlists
    WHERE id = p_setlist_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update all positions in one transaction (deferred constraint is satisfied at commit)
  FOR i IN 1..array_length(p_song_ids, 1) LOOP
    UPDATE public.setlist_songs
    SET position = i - 1
    WHERE setlist_id = p_setlist_id
      AND song_id = p_song_ids[i];
  END LOOP;

  -- Touch the setlist timestamp
  UPDATE public.setlists
  SET updated_at = NOW()
  WHERE id = p_setlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
