CREATE OR REPLACE FUNCTION public.recompact_setlist_positions(p_setlist_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
    FROM public.setlist_songs WHERE setlist_id = p_setlist_id
  )
  UPDATE public.setlist_songs ss SET position = ordered.new_pos
  FROM ordered WHERE ss.id = ordered.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
