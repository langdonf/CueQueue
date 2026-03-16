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
  mode: "viewing" | "editing",
  displayName?: string
): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const localKeyRef = useRef<string>("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const localKey = `user_${Math.random().toString(36).slice(2, 8)}`;
    localKeyRef.current = localKey;

    const channel = supabase.channel(`presence:${setlistId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser & { localKey: string }>();
        const users: PresenceUser[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.localKey === localKey) continue;
            users.push({ name: p.name, mode: p.mode });
          }
        }
        setOthers(users);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ name: displayName ?? "", mode, localKey });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlistId, mode, displayName]);

  return others;
}
