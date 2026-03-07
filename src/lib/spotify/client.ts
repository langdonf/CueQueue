import { getSpotifyClientToken } from "./auth";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  uri: string;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

export async function searchSpotifyTracks(
  query: string,
  limit = 10
): Promise<SpotifyTrack[]> {
  const token = await getSpotifyClientToken();

  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
  });

  const response = await fetch(
    `https://api.spotify.com/v1/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Spotify search error: ${response.status}`);
  }

  const data: SpotifySearchResponse = await response.json();
  return data.tracks.items;
}
