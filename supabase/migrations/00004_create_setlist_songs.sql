CREATE TABLE public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  transition_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(setlist_id, song_id),
  UNIQUE(setlist_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX idx_setlist_songs_position ON public.setlist_songs(setlist_id, position);

-- RLS
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access follows setlist ownership"
  ON public.setlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists s
      WHERE s.id = setlist_id AND s.user_id = auth.uid()
    )
  );
