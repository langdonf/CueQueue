"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

interface UpdateSongInput {
  title?: string;
  artist?: string | null;
  duration_ms?: number | null;
  bpm?: number | null;
  key?: string | null;
  notes?: string | null;
}

export async function addSongToSetlist(
  setlistId: string,
  songInput: CreateSongInput
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Enforce max songs per setlist
  const { count } = await supabase
    .from("setlist_songs")
    .select("*", { count: "exact", head: true })
    .eq("setlist_id", setlistId);

  if (count !== null && count >= MAX_SONGS_PER_SETLIST) {
    return { error: `Setlists are limited to ${MAX_SONGS_PER_SETLIST} songs.` };
  }

  // Create the song
  const { data: song, error: songError } = await supabase
    .from("songs")
    .insert({
      user_id: user.id,
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

  // Get the next position
  const { data: existing } = await supabase
    .from("setlist_songs")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  // Create the junction entry
  const { data: junction, error: junctionError } = await supabase
    .from("setlist_songs")
    .insert({
      setlist_id: setlistId,
      song_id: song.id,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (junctionError) return { error: junctionError.message };

  // Update setlist timestamp
  await supabase
    .from("setlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", setlistId);

  revalidatePath(`/setlists/${setlistId}`);
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

export async function updateSong(songId: string, input: UpdateSongInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("songs")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", songId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

export async function removeSongFromSetlist(
  setlistId: string,
  songId: string
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Remove the junction entry
  const { error } = await supabase
    .from("setlist_songs")
    .delete()
    .eq("setlist_id", setlistId)
    .eq("song_id", songId);

  if (error) return { error: error.message };

  // Recompact positions
  const { data: remaining } = await supabase
    .from("setlist_songs")
    .select("id")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("setlist_songs")
        .update({ position: i })
        .eq("id", remaining[i].id);
    }
  }

  // Update setlist timestamp
  await supabase
    .from("setlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", setlistId);

  revalidatePath(`/setlists/${setlistId}`);
  return { success: true };
}

export async function reorderSongs(
  setlistId: string,
  orderedSongIds: string[]
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Use RPC to reorder in a single transaction (avoids unique constraint conflicts)
  const { error } = await supabase.rpc("reorder_setlist_songs", {
    p_setlist_id: setlistId,
    p_song_ids: orderedSongIds,
  });

  if (error) return { error: error.message };

  revalidatePath(`/setlists/${setlistId}`);
  return { success: true };
}
