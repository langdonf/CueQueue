"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_TIER_LIMITS } from "@/lib/constants";

interface CreateSetlistInput {
  name: string;
  venue: string | null;
  gig_date: string | null;
}

interface UpdateSetlistInput {
  name?: string;
  venue?: string | null;
  gig_date?: string | null;
  notes?: string | null;
}

export async function createSetlist(input: CreateSetlistInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check free tier limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier !== "pro") {
    const { count } = await supabase
      .from("setlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", false);

    if (count !== null && count >= FREE_TIER_LIMITS.maxSetlists) {
      return {
        error: `Free plan is limited to ${FREE_TIER_LIMITS.maxSetlists} setlists. Upgrade to Pro for unlimited.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("setlists")
    .insert({
      user_id: user.id,
      name: input.name,
      venue: input.venue,
      gig_date: input.gig_date,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/setlists");
  return { id: data.id };
}

export async function updateSetlist(id: string, input: UpdateSetlistInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("setlists")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/setlists/${id}`);
  revalidatePath("/setlists");
  return { success: true };
}

export async function deleteSetlist(id: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("setlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/setlists");
  return { success: true };
}

export async function archiveSetlist(id: string, archive = true) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("setlists")
    .update({
      is_archived: archive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/setlists");
  return { success: true };
}

export async function duplicateSetlist(id: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check free tier limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier !== "pro") {
    const { count } = await supabase
      .from("setlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", false);

    if (count !== null && count >= FREE_TIER_LIMITS.maxSetlists) {
      return {
        error: `Free plan is limited to ${FREE_TIER_LIMITS.maxSetlists} setlists. Upgrade to Pro for unlimited.`,
      };
    }
  }

  // Fetch the original setlist
  const { data: original, error: fetchError } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) return { error: "Setlist not found" };

  // Create the duplicate setlist
  const { data: newSetlist, error: createError } = await supabase
    .from("setlists")
    .insert({
      user_id: user.id,
      name: `${original.name} (copy)`,
      venue: original.venue,
      gig_date: original.gig_date,
      notes: original.notes,
    })
    .select("id")
    .single();

  if (createError || !newSetlist) return { error: createError?.message ?? "Failed to create copy" };

  // Fetch all songs from the original setlist via the junction table
  const { data: junctionRows } = await supabase
    .from("setlist_songs")
    .select("position, transition_notes, song:songs(*)")
    .eq("setlist_id", id)
    .order("position", { ascending: true });

  if (junctionRows && junctionRows.length > 0) {
    for (const row of junctionRows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const song = row.song as any;
      if (!song) continue;

      // Create a copy of the song
      const { data: newSong, error: songErr } = await supabase
        .from("songs")
        .insert({
          user_id: user.id,
          title: song.title,
          artist: song.artist,
          duration_ms: song.duration_ms,
          bpm: song.bpm,
          key: song.key,
          notes: song.notes,
          spotify_track_id: song.spotify_track_id,
          spotify_uri: song.spotify_uri,
        })
        .select("id")
        .single();

      if (songErr || !newSong) continue;

      // Link to the new setlist
      await supabase.from("setlist_songs").insert({
        setlist_id: newSetlist.id,
        song_id: newSong.id,
        position: row.position,
        transition_notes: row.transition_notes,
      });
    }
  }

  revalidatePath("/setlists");
  return { id: newSetlist.id };
}

export async function getSetlist(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      *,
      setlist_songs(
        id,
        position,
        transition_notes,
        song:songs(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) return { error: error.message };

  // Sort songs by position
  if (data.setlist_songs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.setlist_songs.sort((a: any, b: any) => a.position - b.position);
  }

  return { data };
}
