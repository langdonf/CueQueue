-- Replace the blanket "Users can update own profile" policy with one
-- that only allows updating safe columns (display_name, avatar_url).
-- Sensitive columns (subscription_tier, stripe_customer_id, is_lifetime_pro,
-- stripe_subscription_id) can ONLY be changed by the admin/service-role client.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (safe columns only)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Ensure sensitive columns haven't changed from their current values.
    -- We compare new values to old by selecting the current row.
    subscription_tier = (SELECT p.subscription_tier FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM public.profiles p WHERE p.id = auth.uid())
    AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT p.stripe_subscription_id FROM public.profiles p WHERE p.id = auth.uid())
    AND is_lifetime_pro = (SELECT p.is_lifetime_pro FROM public.profiles p WHERE p.id = auth.uid())
  );
