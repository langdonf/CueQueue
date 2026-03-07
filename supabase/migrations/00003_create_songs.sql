CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  duration_ms INTEGER,
  bpm INTEGER,
  key TEXT,
  spotify_track_id TEXT,
  spotify_uri TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_songs_user_id ON public.songs(user_id);
CREATE INDEX idx_songs_spotify_track_id ON public.songs(spotify_track_id);

-- RLS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can do everything with own songs"
  ON public.songs FOR ALL
  USING (auth.uid() = user_id);
