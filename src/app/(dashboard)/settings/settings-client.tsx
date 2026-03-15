"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, Loader2, LogOut, Trash2, ExternalLink } from "lucide-react";
import { updateDisplayName, updateDefaultBreakDuration, deleteAccount } from "@/actions/profile-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SettingsClientProps {
  email: string;
  displayName: string | null;
  defaultBreakDurationMs: number;
  isPro: boolean;
  version: string;
  subscriptionSlot: React.ReactNode;
}

const BREAK_OPTIONS = [
  { label: "5 min", value: 5 * 60 * 1000 },
  { label: "10 min", value: 10 * 60 * 1000 },
  { label: "15 min", value: 15 * 60 * 1000 },
  { label: "20 min", value: 20 * 60 * 1000 },
  { label: "30 min", value: 30 * 60 * 1000 },
];

export function SettingsClient({ email, displayName, defaultBreakDurationMs, isPro, version, subscriptionSlot }: SettingsClientProps) {
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [breakDuration, setBreakDuration] = useState(defaultBreakDurationMs);
  const [savingBreak, setSavingBreak] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveName() {
    setSavingName(true);
    const result = await updateDisplayName(name);
    setSavingName(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setEditingName(false);
    toast.success("Display name updated");
  }

  async function handleBreakDurationChange(ms: number) {
    setBreakDuration(ms);
    setSavingBreak(true);
    const result = await updateDefaultBreakDuration(ms);
    setSavingBreak(false);
    if ("error" in result) {
      toast.error(result.error);
      setBreakDuration(defaultBreakDurationMs);
      return;
    }
    toast.success("Default break duration updated");
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        "Are you sure you want to delete your account? All your setlists, songs, and share links will be permanently deleted. This cannot be undone."
      )
    )
      return;

    setDeleting(true);
    const result = await deleteAccount();
    if ("error" in result) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div>
      {/* Profile */}
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Profile
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email</span>
          <span>{email}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Display name</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setName(displayName ?? "");
                  }
                }}
                autoFocus
                disabled={savingName}
                maxLength={50}
                className="w-36 px-2 py-1 bg-secondary border border-border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder="Your name"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {savingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{name || "Not set"}</span>
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <hr className="border-border my-6" />

      {/* Subscription */}
      {subscriptionSlot}

      <hr className="border-border my-6" />

      {/* Preferences */}
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Preferences
      </h2>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Default break duration</span>
        <div className="flex items-center gap-2">
          <select
            value={breakDuration}
            onChange={(e) => handleBreakDurationChange(Number(e.target.value))}
            disabled={savingBreak}
            className="px-2 py-1 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 appearance-none cursor-pointer"
          >
            {BREAK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {savingBreak && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <hr className="border-border my-6" />

      {/* About */}
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        About
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Version</span>
          <span className="font-mono text-muted-foreground">{version}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Feedback</span>
          <a
            href="mailto:lfroker@gmail.com"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Send feedback
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <hr className="border-border my-6" />

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {signingOut ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        {signingOut ? "Signing out..." : "Sign out"}
      </button>

      <hr className="border-border my-6" />

      {/* Delete account */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Delete account</span>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="flex items-center gap-1.5 text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
