"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePro } from "@/lib/subscription";

export async function createShareLink(
  setlistId: string,
  permission: "view" | "edit" = "view"
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Pro gate: sharing requires Pro subscription
  const proError = await requirePro();
  if (proError) return proError;

  // Verify user owns this setlist
  const { data: setlist } = await supabase
    .from("setlists")
    .select("id")
    .eq("id", setlistId)
    .eq("user_id", user.id)
    .single();

  if (!setlist) return { error: "Setlist not found" };

  const { data, error } = await supabase
    .from("share_links")
    .insert({
      setlist_id: setlistId,
      permission,
    })
    .select("id, token, permission")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/setlists/${setlistId}/share`);
  return { data };
}

export async function revokeShareLink(linkId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("id", linkId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function getShareLinks(setlistId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("share_links")
    .select("id, token, permission, is_active, created_at")
    .eq("setlist_id", setlistId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function getSharedSetlist(token: string) {
  const admin = createSupabaseAdminClient();

  // Look up the share link
  const { data: shareLink, error: linkError } = await admin
    .from("share_links")
    .select("setlist_id, permission")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (linkError || !shareLink) return { error: "Invalid or expired link" };

  // Fetch the setlist with songs
  const { data: setlist, error: setlistError } = await admin
    .from("setlists")
    .select(
      `
      id, name, venue, gig_date, notes, user_id,
      setlist_songs(
        id,
        position,
        transition_notes,
        song:songs(id, title, artist, duration_ms, bpm, key, notes, spotify_uri)
      )
    `
    )
    .eq("id", shareLink.setlist_id)
    .single();

  if (setlistError || !setlist) return { error: "Setlist not found" };

  // Sort songs by position
  if (setlist.setlist_songs) {
    setlist.setlist_songs.sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position
    );
  }

  return {
    data: setlist,
    permission: shareLink.permission,
  };
}
