-- Add accent theme preference to profiles.
-- Defaults to 'warm' (the current tan color scheme).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accent_theme TEXT NOT NULL DEFAULT 'warm';
