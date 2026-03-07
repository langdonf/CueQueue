import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscriptionTier = "free" | "pro";

/**
 * Get the subscription tier for the currently authenticated user.
 * Returns "free" if not authenticated or no profile found.
 */
export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "free";

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, is_lifetime_pro")
    .eq("id", user.id)
    .single();

  // Lifetime pro (friends & family) always gets pro access
  if (profile?.is_lifetime_pro) return "pro";

  return (profile?.subscription_tier as SubscriptionTier) ?? "free";
}

/**
 * Check if the current user has a pro subscription.
 */
export async function isProUser(): Promise<boolean> {
  const tier = await getSubscriptionTier();
  return tier === "pro";
}

/**
 * Require pro subscription. Returns an error object if not pro.
 * Matches the existing { error: string } pattern used in server actions.
 */
export async function requirePro(): Promise<{ error: string } | null> {
  const isPro = await isProUser();
  if (!isPro) {
    return {
      error:
        "This feature requires a Pro subscription. Upgrade for just $5/year.",
    };
  }
  return null;
}
