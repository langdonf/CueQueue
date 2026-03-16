-- Add a user preference for whether song notes are expanded by default in the setlist editor.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_notes_expanded BOOLEAN NOT NULL DEFAULT true;
