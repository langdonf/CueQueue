"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sharedAddLimiter,
  sharedRemoveLimiter,
  sharedReorderLimiter,
} from "@/lib/rate-limit";

const MAX_SONGS_PER_SETLIST = 100;

interface CreateSongInput {
  title: string;
  artist?: string | null;
  duration_ms?: number | null;
  bpm?: number | null;
  key?: string | null;
  spotify_track_id?: string | null;
  spotify_uri?: string | null;
  notes?: string | null;
}

/**
 * Validates a share token has edit permission for the given setlist.
 * Returns the setlist owner's user_id, or an error.
 */
async function validateEditToken(
  token: string,
  setlistId: string
): Promise<{ userId: string } | { error: string }> {
  const admin = createSupabaseAdminClient();

  const { data: shareLink, error } = await admin
    .from("share_links")
    .select("setlist_id, permission, is_active")
    .eq("token", token)
    .single();

  if (error || !shareLink) return { error: "Invalid share link" };
  if (!shareLink.is_active) return { error: "Share link is no longer active" };
  if (shareLink.permission !== "edit")
    return { error: "This link is view-only" };
  if (shareLink.setlist_id !== setlistId)
    return { error: "Token does not match setlist" };

  // Get the setlist owner's user_id (songs are attributed to the owner)
  const { data: setlist, error: setlistError } = await admin
    .from("setlists")
    .select("user_id")
    .eq("id", setlistId)
    .single();

  if (setlistError || !setlist) return { error: "Setlist not found" };

  return { userId: setlist.user_id };
}

export async function sharedAddSongToSetlist(
  token: string,
  setlistId: string,
  songInput: CreateSongInput
) {
  // Rate limit: 50 adds per token per hour
  const rateCheck = sharedAddLimiter.check(token);
  if (!rateCheck.allowed) {
    return { error: "Too many songs added. Please try again later." };
  }

  const validation = await validateEditToken(token, setlistId);
  if ("error" in validation) return { error: validation.error };

  const admin = createSupabaseAdminClient();

  // Enforce max songs per setlist
  const { count } = await admin
    .from("setlist_songs")
    .select("*", { count: "exact", head: true })
    .eq("setlist_id", setlistId);

  if (count !== null && count >= MAX_SONGS_PER_SETLIST) {
    return { error: `Setlists are limited to ${MAX_SONGS_PER_SETLIST} songs.` };
  }

  // Create the song attributed to the setlist owner
  const { data: song, error: songError } = await admin
    .from("songs")
    .insert({
      user_id: validation.userId,
      title: songInput.title,
      artist: songInput.artist,
      duration_ms: songInput.duration_ms,
      bpm: songInput.bpm,
      key: songInput.key,
      spotify_track_id: songInput.spotify_track_id,
      spotify_uri: songInput.spotify_uri,
      notes: songInput.notes,
    })
    .select("*")
    .single();

  if (songError) return { error: songError.message };

  // Get next position
  const { data: existing } = await admin
    .from("setlist_songs")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing && existing.length > 0 ? existing[0].position + 1 : 0;

  // Create junction entry
  const { data: junction, error: junctionError } = await admin
    .from("setlist_songs")
    .insert({
      setlist_id: setlistId,
      song_id: song.id,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (junctionError) return { error: junctionError.message };

  // Touch setlist timestamp
  await admin
    .from("setlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", setlistId);

  revalidatePath(`/shared/${token}`);
  return {
    song: {
      id: song.id,
      setlistSongId: junction.id,
      position: nextPosition,
      title: song.title,
      artist: song.artist,
      duration_ms: song.duration_ms,
      bpm: song.bpm,
      key: song.key,
      notes: song.notes,
      spotify_uri: song.spotify_uri,
      transitionNotes: null,
    },
  };
}

export async function sharedRemoveSongFromSetlist(
  token: string,
  setlistId: string,
  songId: string
) {
  // Rate limit: 50 removals per token per hour
  const rateCheck = sharedRemoveLimiter.check(token);
  if (!rateCheck.allowed) {
    return { error: "Too many actions. Please try again later." };
  }

  const validation = await validateEditToken(token, setlistId);
  if ("error" in validation) return { error: validation.error };

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("setlist_songs")
    .delete()
    .eq("setlist_id", setlistId)
    .eq("song_id", songId);

  if (error) return { error: error.message };

  // Recompact positions
  const { data: remaining } = await admin
    .from("setlist_songs")
    .select("id")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await admin
        .from("setlist_songs")
        .update({ position: i })
        .eq("id", remaining[i].id);
    }
  }

  await admin
    .from("setlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", setlistId);

  revalidatePath(`/shared/${token}`);
  return { success: true };
}

export async function sharedReorderSongs(
  token: string,
  setlistId: string,
  orderedSongIds: string[]
) {
  // Rate limit: 100 reorders per token per hour
  const rateCheck = sharedReorderLimiter.check(token);
  if (!rateCheck.allowed) {
    return { error: "Too many actions. Please try again later." };
  }

  const validation = await validateEditToken(token, setlistId);
  if ("error" in validation) return { error: validation.error };

  const admin = createSupabaseAdminClient();

  // Two-pass reorder: set to negative values first, then final positions.
  // This avoids UNIQUE(setlist_id, position) violations since each
  // admin client .update() is a separate HTTP request (separate transaction).
  for (let i = 0; i < orderedSongIds.length; i++) {
    await admin
      .from("setlist_songs")
      .update({ position: -(i + 1) })
      .eq("setlist_id", setlistId)
      .eq("song_id", orderedSongIds[i]);
  }

  for (let i = 0; i < orderedSongIds.length; i++) {
    await admin
      .from("setlist_songs")
      .update({ position: i })
      .eq("setlist_id", setlistId)
      .eq("song_id", orderedSongIds[i]);
  }

  await admin
    .from("setlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", setlistId);

  revalidatePath(`/shared/${token}`);
  return { success: true };
}
