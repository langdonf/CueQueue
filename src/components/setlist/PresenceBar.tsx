"use client";

import { useSetlistPresence } from "@/hooks/useSetlistPresence";

interface PresenceBarProps {
  setlistId: string;
  mode: "viewing" | "editing";
  displayName?: string;
}

export function PresenceBar({ setlistId, mode, displayName }: PresenceBarProps) {
  const others = useSetlistPresence(setlistId, mode, displayName);

  if (others.length === 0) return null;

  const editing = others.filter((u) => u.mode === "editing");
  const viewing = others.filter((u) => u.mode === "viewing");

  function describeGroup(users: typeof others, verb: string) {
    const named = users.filter((u) => u.name);
    const anonCount = users.length - named.length;

    if (named.length === 0) {
      // All anonymous
      return users.length === 1
        ? `1 user ${verb}`
        : `${users.length} users ${verb}`;
    }

    const names = named.map((u) => u.name).join(", ");
    if (anonCount === 0) return `${names} ${verb}`;
    return `${names} + ${anonCount} ${anonCount === 1 ? "user" : "users"} ${verb}`;
  }

  const parts: string[] = [];
  if (editing.length > 0) parts.push(describeGroup(editing, "editing"));
  if (viewing.length > 0) parts.push(describeGroup(viewing, "viewing"));

  return (
    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
      <div className="flex -space-x-1.5">
        {others.slice(0, 5).map((user, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-bold text-primary"
            title={user.name || "User"}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : "?"}
          </div>
        ))}
      </div>
      <span>{parts.join(" · ")}</span>
    </div>
  );
}
