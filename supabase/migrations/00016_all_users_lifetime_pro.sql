-- Make all users lifetime pro (temporarily removing paywall)
UPDATE public.profiles SET is_lifetime_pro = TRUE WHERE is_lifetime_pro = FALSE;

-- New users should also default to lifetime pro
ALTER TABLE public.profiles ALTER COLUMN is_lifetime_pro SET DEFAULT TRUE;
