"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">{feature} is a Pro feature</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs">
        Upgrade to SetList Pro for just $5/year to unlock {feature}, unlimited
        setlists, and more.
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Loading..." : "Upgrade to Pro — $5/year"}
      </button>
    </div>
  );
}
