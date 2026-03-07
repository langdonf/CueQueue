-- Add lifetime pro flag for friends & family grants
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_lifetime_pro BOOLEAN NOT NULL DEFAULT FALSE;
