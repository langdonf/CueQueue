CREATE TABLE public.setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  venue TEXT,
  gig_date DATE,
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_setlists_user_id ON public.setlists(user_id);
CREATE INDEX idx_setlists_gig_date ON public.setlists(gig_date);

-- RLS
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can do everything with own setlists"
  ON public.setlists FOR ALL
  USING (auth.uid() = user_id);
