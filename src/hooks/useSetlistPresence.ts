"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface PresenceUser {
  name: string;
  mode: "viewing" | "editing";
}

/**
 * Tracks who is currently viewing/editing a setlist via Supabase Realtime Presence.
 * Returns a list of other users (excludes the local user).
 */
export function useSetlistPresence(
  setlistId: string,
  mode: "viewing" | "editing"
): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const localKeyRef = useRef<string>("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const localKey = `user_${Math.random().toString(36).slice(2, 8)}`;
    localKeyRef.current = localKey;

    // Determine the user's display name
    async function getDisplayName(): Promise<string> {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Try to fetch profile name
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        if (profile?.display_name) return profile.display_name;
        return user.email?.split("@")[0] ?? "User";
      }
      // Anonymous/shared user — no identifiable name
      return "";
    }

    const channel = supabase.channel(`presence:${setlistId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser & { localKey: string }>();
        const users: PresenceUser[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            // Skip self by matching our custom localKey field
            if (p.localKey === localKey) continue;
            users.push({ name: p.name, mode: p.mode });
          }
        }
        setOthers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const name = await getDisplayName();
          channel.track({ name, mode, localKey });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlistId, mode]);

  return others;
}
