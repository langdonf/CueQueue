"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateDisplayName(displayName: string) {
  try {
    return await withAuth(async (supabase, user) => {
      const trimmed = displayName.trim();
      if (trimmed.length > 50) return { error: "Name too long (max 50 characters)" };

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed || null })
        .eq("id", user.id);

      if (error) return { error: error.message };

      revalidatePath("/setlists", "layout");
      return { data: { displayName: trimmed || null } };
    });
  } catch (e) {
    console.error("updateDisplayName error:", e);
    return { error: "Failed to update display name" };
  }
}

export async function updateDefaultBreakDuration(durationMs: number) {
  try {
    return await withAuth(async (supabase, user) => {
      if (durationMs < 60000 || durationMs > 3600000) {
        return { error: "Break duration must be between 1 and 60 minutes" };
      }

      const { error } = await supabase
        .from("profiles")
        .update({ default_break_duration_ms: durationMs })
        .eq("id", user.id);

      if (error) return { error: error.message };

      // Invalidate all setlist pages so they pick up the new break duration
      revalidatePath("/setlists", "layout");
      return { data: { durationMs } };
    });
  } catch (e) {
    console.error("updateDefaultBreakDuration error:", e);
    return { error: "Failed to update break duration" };
  }
}

export async function deleteAccount() {
  return withAuth(async (_supabase, user) => {
    const admin = createSupabaseAdminClient();

    // Delete the user via admin API — cascade will handle profiles, setlists, etc.
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) return { error: error.message };

    return { data: undefined };
  });
}
