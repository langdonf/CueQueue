import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_TIER_LIMITS } from "@/lib/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Enforce the free-tier setlist limit.
 * Returns an error object if the user is at the limit, null otherwise.
 */
export async function enforceSetlistLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: string } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, is_lifetime_pro")
    .eq("id", userId)
    .single();

  if (profile?.is_lifetime_pro || profile?.subscription_tier === "pro") {
    return null;
  }

  const { count } = await supabase
    .from("setlists")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", false);

  if (count !== null && count >= FREE_TIER_LIMITS.maxSetlists) {
    return {
      error: `Free plan is limited to ${FREE_TIER_LIMITS.maxSetlists} setlists. Upgrade to Pro for unlimited.`,
    };
  }

  return null;
}
