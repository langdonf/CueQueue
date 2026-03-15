export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { error: string; data?: never };

export interface SongItem {
  id: string;
  setlistSongId: string;
  position: number;
  title: string;
  artist: string | null;
  duration_ms: number | null;
  bpm: number | null;
  key: string | null;
  notes: string | null;
  spotify_uri: string | null;
  transitionNotes: string | null;
}

export interface CreateSongInput {
  title: string;
  artist?: string | null;
  duration_ms?: number | null;
  bpm?: number | null;
  key?: string | null;
  spotify_track_id?: string | null;
  spotify_uri?: string | null;
  notes?: string | null;
}

export interface UpdateSongInput {
  title?: string;
  artist?: string | null;
  duration_ms?: number | null;
  bpm?: number | null;
  key?: string | null;
  notes?: string | null;
}

export interface SetlistSongRow {
  id: string;
  position: number;
  transition_notes: string | null;
  song: {
    id: string;
    title: string;
    artist: string | null;
    duration_ms: number | null;
    bpm: number | null;
    key: string | null;
    notes: string | null;
    spotify_uri: string | null;
  };
}

export function mapSetlistSongs(rows: SetlistSongRow[]): SongItem[] {
  return rows.map((ss) => ({
    id: ss.song.id,
    setlistSongId: ss.id,
    position: ss.position,
    title: ss.song.title,
    artist: ss.song.artist,
    duration_ms: ss.song.duration_ms,
    bpm: ss.song.bpm,
    key: ss.song.key,
    notes: ss.song.notes,
    spotify_uri: ss.song.spotify_uri ?? null,
    transitionNotes: ss.transition_notes ?? null,
  }));
}
