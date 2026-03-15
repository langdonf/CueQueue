CREATE OR REPLACE FUNCTION public.reorder_setlist_songs_admin(
  p_setlist_id UUID, p_song_ids UUID[]
) RETURNS VOID AS $$
DECLARE i INT;
BEGIN
  FOR i IN 1..array_length(p_song_ids, 1) LOOP
    UPDATE public.setlist_songs SET position = i - 1
    WHERE setlist_id = p_setlist_id AND song_id = p_song_ids[i];
  END LOOP;
  UPDATE public.setlists SET updated_at = NOW() WHERE id = p_setlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
