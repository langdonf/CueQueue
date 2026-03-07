import { NextResponse } from "next/server";
import { searchSpotifyTracks } from "@/lib/spotify/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { spotifySearchLimiter } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const shareToken = searchParams.get("token");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ tracks: [] });
  }

  // --- Auth gate: require either a logged-in user or a valid share token ---
  let authorized = false;
  let rateLimitKey: string | null = null;

  // 1) Check for authenticated session (owner editing their own setlist)
  try {
    const supabase = await createSupabaseServerClient();
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
    const tracks = await searchSpotifyTracks(query.trim());

    // Return simplified track data
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
