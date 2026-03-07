CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_share_links_token ON public.share_links(token);

-- RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Setlist owner can manage share links
CREATE POLICY "Setlist owner manages share links"
  ON public.share_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists s
      WHERE s.id = setlist_id AND s.user_id = auth.uid()
    )
  );

-- Anyone can look up active share links by token (for public access)
CREATE POLICY "Anyone can read active share links by token"
  ON public.share_links FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Allow anonymous read access to setlists that have active share links
CREATE POLICY "Shared setlists are viewable via token"
  ON public.setlists FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.share_links sl
      WHERE sl.setlist_id = setlists.id
        AND sl.is_active = TRUE
        AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );

-- Allow anonymous read access to songs in shared setlists
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

-- Allow anonymous read access to songs that are in shared setlists
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
