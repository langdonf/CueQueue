"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth";
import type { CreateSongInput, UpdateSongInput, SongItem } from "@/lib/types";

const MAX_SONGS_PER_SETLIST = 100;

export async function addSongToSetlist(
  setlistId: string,
  songInput: CreateSongInput
) {
  return withAuth(async (supabase, user) => {
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
      data: {
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
        } as SongItem,
      },
    };
  });
}

export async function updateSong(songId: string, input: UpdateSongInput) {
  return withAuth(async (supabase, user) => {
    const { error } = await supabase
      .from("songs")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", songId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    return { data: undefined };
  });
}

export async function removeSongFromSetlist(
  setlistId: string,
  songId: string
) {
  return withAuth(async (supabase, user) => {
    // Verify setlist ownership before removing
    const { data: setlist } = await supabase
      .from("setlists")
      .select("id")
      .eq("id", setlistId)
      .eq("user_id", user.id)
      .single();

    if (!setlist) return { error: "Setlist not found" };

    // Remove the junction entry
    const { error } = await supabase
      .from("setlist_songs")
      .delete()
      .eq("setlist_id", setlistId)
      .eq("song_id", songId);

    if (error) return { error: error.message };

    // Recompact positions in a single RPC call
    await supabase.rpc("recompact_setlist_positions", { p_setlist_id: setlistId });

    // Update setlist timestamp
    await supabase
      .from("setlists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", setlistId);

    revalidatePath(`/setlists/${setlistId}`);
    return { data: undefined };
  });
}

export async function updateTransitionNotes(
  setlistSongId: string,
  transitionNotes: string | null
) {
  return withAuth(async (supabase, user) => {
    // Verify ownership: setlist_song -> setlist -> user
    const { data: setlistSong } = await supabase
      .from("setlist_songs")
      .select("setlist_id")
      .eq("id", setlistSongId)
      .single();

    if (!setlistSong) return { error: "Song link not found" };

    const { data: setlist } = await supabase
      .from("setlists")
      .select("id")
      .eq("id", setlistSong.setlist_id)
      .eq("user_id", user.id)
      .single();

    if (!setlist) return { error: "Not authorized" };

    const { error } = await supabase
      .from("setlist_songs")
      .update({ transition_notes: transitionNotes })
      .eq("id", setlistSongId);

    if (error) return { error: error.message };

    return { data: undefined };
  });
}

export async function getLibrarySongs() {
  return withAuth(async (supabase, user) => {
    // Get all user songs, most recent first
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, duration_ms, bpm, key, notes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { error: error.message };

    // Deduplicate by title+artist (keep first = most recent)
    const seen = new Set<string>();
    const unique = (data ?? []).filter((song) => {
      const dedupeKey = `${song.title?.toLowerCase()}|${song.artist?.toLowerCase() ?? ""}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });

    return { data: { songs: unique } };
  });
}

export async function reorderSongs(
  setlistId: string,
  orderedSongIds: string[]
) {
  return withAuth(async (supabase) => {
    // Use RPC to reorder in a single transaction (avoids unique constraint conflicts)
    const { error } = await supabase.rpc("reorder_setlist_songs", {
      p_setlist_id: setlistId,
      p_song_ids: orderedSongIds,
    });

    if (error) return { error: error.message };

    revalidatePath(`/setlists/${setlistId}`);
    return { data: undefined };
  });
}
