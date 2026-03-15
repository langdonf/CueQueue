import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  UpgradeButton,
  ManageSubscriptionButton,
} from "@/components/subscription/SubscriptionButtons";
import { UpgradeSuccessToast } from "./upgrade-toast";
import { SettingsClient } from "./settings-client";

interface SettingsPageProps {
  searchParams: Promise<{ upgraded?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { upgraded } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, subscription_tier, default_break_duration_ms")
    .eq("id", user.id)
    .single();

  const isPro = profile?.subscription_tier === "pro";

  const subscriptionSlot = isPro ? (
    <div>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Subscription
      </h2>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">SetList Pro — $5/year</span>
        <ManageSubscriptionButton />
      </div>
    </div>
  ) : (
    <div>
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Subscription
      </h2>
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-muted-foreground">Plan</span>
        <span>Free</span>
      </div>
      <UpgradeButton />
    </div>
  );

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
      {upgraded === "true" && <UpgradeSuccessToast />}

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <SettingsClient
        email={user.email ?? ""}
        displayName={profile?.display_name ?? null}
        defaultBreakDurationMs={profile?.default_break_duration_ms ?? 900000}
        version="0.1.0"
        subscriptionSlot={subscriptionSlot}
      />
    </div>
  );
}
