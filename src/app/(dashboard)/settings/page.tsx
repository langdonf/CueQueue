import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  UpgradeButton,
  ManageSubscriptionButton,
} from "@/components/subscription/SubscriptionButtons";
import { UpgradeSuccessToast } from "./upgrade-toast";

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
    .select("display_name, subscription_tier")
    .eq("id", user.id)
    .single();

  const isPro = profile?.subscription_tier === "pro";

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto">
      {upgraded === "true" && <UpgradeSuccessToast />}

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Account */}
        <div className="p-4 bg-card border border-border rounded-xl">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Account
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Plan</span>
              {isPro ? (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded">
                  PRO
                </span>
              ) : (
                <span className="capitalize">Free</span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription - Free users */}
        {!isPro && (
          <div className="p-4 bg-card border border-primary/30 rounded-xl">
            <h2 className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
              Upgrade to Pro
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Unlimited setlists, Live Mode, Sharing, and more.
            </p>
            <UpgradeButton />
          </div>
        )}

        {/* Subscription - Pro users */}
        {isPro && (
          <div className="p-4 bg-card border border-border rounded-xl">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Subscription
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm">SetList Pro — $5/year</span>
              <ManageSubscriptionButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
