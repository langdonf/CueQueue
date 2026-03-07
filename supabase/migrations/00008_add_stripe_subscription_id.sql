-- Add stripe_subscription_id to profiles for subscription management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for looking up profiles by stripe_customer_id (used in webhooks)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;
