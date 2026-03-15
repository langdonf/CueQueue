"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePro } from "@/lib/subscription";

export async function createShareLink(
  setlistId: string,
  permission: "view" | "edit" = "view",
  name?: string
) {
  return withAuth(async (supabase, user) => {
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
        name: name?.trim() || null,
      })
      .select("id, token, permission, name")
      .single();

    if (error) return { error: error.message };

    revalidatePath(`/setlists/${setlistId}/share`);
    return { data };
  });
}

export async function updateShareLinkName(linkId: string, name: string) {
  return withAuth(async (supabase, user) => {
    // Verify ownership: share_link -> setlist -> user
    const { data: link } = await supabase
      .from("share_links")
      .select("setlist_id")
      .eq("id", linkId)
      .single();

    if (!link) return { error: "Share link not found" };

    const { data: setlist } = await supabase
      .from("setlists")
      .select("id")
      .eq("id", link.setlist_id)
      .eq("user_id", user.id)
      .single();

    if (!setlist) return { error: "Not authorized" };

    const { error } = await supabase
      .from("share_links")
      .update({ name: name.trim() || null })
      .eq("id", linkId);

    if (error) return { error: error.message };

    return { data: undefined };
  });
}

export async function revokeShareLink(linkId: string) {
  return withAuth(async (supabase, user) => {
    // Verify ownership: share_link -> setlist -> user
    const { data: link } = await supabase
      .from("share_links")
      .select("setlist_id")
      .eq("id", linkId)
      .single();

    if (!link) return { error: "Share link not found" };

    const { data: setlist } = await supabase
      .from("setlists")
      .select("id")
      .eq("id", link.setlist_id)
      .eq("user_id", user.id)
      .single();

    if (!setlist) return { error: "Not authorized" };

    const { error } = await supabase
      .from("share_links")
      .update({ is_active: false })
      .eq("id", linkId);

    if (error) return { error: error.message };

    return { data: undefined };
  });
}

export async function getShareLinks(setlistId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("share_links")
      .select("id, token, permission, name, is_active, created_at")
      .eq("setlist_id", setlistId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { data };
  });
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
