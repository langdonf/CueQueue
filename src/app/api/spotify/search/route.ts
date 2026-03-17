import { NextResponse } from "next/server";
import { searchSpotifyTracks } from "@/lib/spotify/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { spotifySearchLimiter } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const shareToken = searchParams.get("token");
  const setlistId = searchParams.get("setlistId");

  // If no query, return only library results (used on mount to prefetch)
  if (!query || query.trim().length === 0) {
    // Still need auth for library fetch
    let supabaseForLib: SupabaseClient | null = null;
    let userIdForLib: string | null = null;
    try {
      supabaseForLib = await createSupabaseServerClient();
      const { data: { user } } = await supabaseForLib.auth.getUser();
      if (user) {
        userIdForLib = user.id;
      }
    } catch { /* no session */ }
    const lib = await fetchUserLibrary(supabaseForLib, userIdForLib, setlistId);
    return NextResponse.json({ tracks: [], library: lib });
  }

  // --- Auth gate: require either a logged-in user or a valid share token ---
  let authorized = false;
  let rateLimitKey: string | null = null;
  let supabase: SupabaseClient | null = null;

  // 1) Check for authenticated session (owner editing their own setlist)
  try {
    supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      authorized = true;
      // Authenticated users get a generous limit keyed by user ID
      rateLimitKey = `user:${user.id}`;
    }
  } catch {
    // No session — fall through to token check
  }

  // 2) Check for a valid share token (shared editor, no account needed)
  if (!authorized && shareToken) {
    const admin = createSupabaseAdminClient();
    const { data: shareLink } = await admin
      .from("share_links")
      .select("id, permission, is_active")
      .eq("token", shareToken)
      .single();

    if (shareLink?.is_active && shareLink.permission === "edit") {
      authorized = true;
      rateLimitKey = `token:${shareToken}`;
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // --- Rate limit (applied to both auth paths, stricter for tokens) ---
  if (rateLimitKey) {
    const rateCheck = spotifySearchLimiter.check(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many searches. Please wait a moment." },
        { status: 429 }
      );
    }
  }

  try {
    const trimmed = query.trim();
    const tracks = await searchSpotifyTracks(trimmed);

    // Return simplified track data (library is fetched once on mount, filtered client-side)
    const simplified = tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      album: t.album.name,
      albumArt: t.album.images[t.album.images.length - 1]?.url ?? null,
      duration_ms: t.duration_ms,
      uri: t.uri,
    }));

    return NextResponse.json({ tracks: simplified });
  } catch (error) {
    console.error("Spotify search error:", error);
    return NextResponse.json(
      { error: "Failed to search Spotify" },
      { status: 500 }
    );
  }
}

/**
 * Fetch all of the user's previously-added songs, deduped by title+artist,
 * excluding breaks and songs already in the current setlist.
 */
async function fetchUserLibrary(
  supabase: SupabaseClient | null,
  userId: string | null,
  setlistId: string | null
) {
  if (!supabase || !userId) return [];

  const { data: songs, error } = await supabase
    .from("songs")
    .select("id, title, artist, duration_ms, spotify_uri")
    .eq("user_id", userId)
    .neq("title", "___SET_BREAK___")
    .order("title")
    .limit(200);

  if (error || !songs) return [];

  // If we have a setlistId, filter out songs already in this setlist
  let existingSongIds = new Set<string>();
  if (setlistId) {
    const { data: existing } = await supabase
      .from("setlist_songs")
      .select("song_id")
      .eq("setlist_id", setlistId);
    if (existing) {
      existingSongIds = new Set(existing.map((r) => r.song_id));
    }
  }

  // Dedupe by lowercase title+artist
  const seen = new Set<string>();
  const results: Array<{
    id: string;
    title: string;
    artist: string | null;
    duration_ms: number | null;
    spotify_uri: string | null;
  }> = [];

  for (const song of songs) {
    if (existingSongIds.has(song.id)) continue;
    const key = `${song.title.toLowerCase()}|${(song.artist ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration_ms: song.duration_ms,
      spotify_uri: song.spotify_uri,
    });
  }

  return results;
}
