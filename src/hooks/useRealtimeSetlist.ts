"use client";

import { useEffect, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SongItem } from "@/lib/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Subscribes to Supabase Realtime changes on `setlist_songs` and `songs` tables,
 * merging remote changes into local state. Returns `markPending` for self-echo suppression.
 */
export function useRealtimeSetlist(
  setlistId: string,
  songs: SongItem[],
  setSongs: React.Dispatch<React.SetStateAction<SongItem[]>>
): {
  markPending: (op: string) => void;
} {
  const pendingOps = useRef<Set<string>>(new Set());
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const songsRef = useRef(songs);
  songsRef.current = songs;

  const markPending = useCallback((op: string) => {
    pendingOps.current.add(op);
    // Auto-expire after 5s to prevent leaks
    setTimeout(() => pendingOps.current.delete(op), 5000);
  }, []);

  // Fetch a full song row by joining setlist_songs + songs
  const fetchSongItem = useCallback(
    async (
      supabase: ReturnType<typeof createSupabaseBrowserClient>,
      setlistSongId: string
    ): Promise<SongItem | null> => {
      const { data, error } = await supabase
        .from("setlist_songs")
        .select(
          "id, position, transition_notes, song:songs(id, title, artist, duration_ms, bpm, key, notes, spotify_uri)"
        )
        .eq("id", setlistSongId)
        .single();

      if (error || !data) return null;

      const song = data.song as unknown as {
        id: string;
        title: string;
        artist: string | null;
        duration_ms: number | null;
        bpm: number | null;
        key: string | null;
        notes: string | null;
        spotify_uri: string | null;
      };

      return {
        id: song.id,
        setlistSongId: data.id,
        position: data.position,
        title: song.title,
        artist: song.artist,
        duration_ms: song.duration_ms,
        bpm: song.bpm,
        key: song.key,
        notes: song.notes,
        spotify_uri: song.spotify_uri ?? null,
        transitionNotes: data.transition_notes ?? null,
      };
    },
    []
  );

  // Refetch the full song list for this setlist (used after reorders)
  const refetchAllSongs = useCallback(
    async (supabase: ReturnType<typeof createSupabaseBrowserClient>) => {
      const { data, error } = await supabase
        .from("setlist_songs")
        .select(
          "id, position, transition_notes, song:songs(id, title, artist, duration_ms, bpm, key, notes, spotify_uri)"
        )
        .eq("setlist_id", setlistId)
        .order("position");

      if (error || !data) return;

      const mapped: SongItem[] = data.map((row) => {
        const song = row.song as unknown as {
          id: string;
          title: string;
          artist: string | null;
          duration_ms: number | null;
          bpm: number | null;
          key: string | null;
          notes: string | null;
          spotify_uri: string | null;
        };
        return {
          id: song.id,
          setlistSongId: row.id,
          position: row.position,
          title: song.title,
          artist: song.artist,
          duration_ms: song.duration_ms,
          bpm: song.bpm,
          key: song.key,
          notes: song.notes,
          spotify_uri: song.spotify_uri ?? null,
          transitionNotes: row.transition_notes ?? null,
        };
      });

      setSongs(mapped);
    },
    [setlistId, setSongs]
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`setlist:${setlistId}`)
      // Listen to setlist_songs changes filtered by setlist_id
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "setlist_songs",
          filter: `setlist_id=eq.${setlistId}`,
        },
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const { eventType } = payload;

          if (eventType === "INSERT") {
            const newRow = payload.new as { id: string; song_id: string };
            const opKey = `add:${newRow.song_id}`;
            if (pendingOps.current.has(opKey)) {
              pendingOps.current.delete(opKey);
              return;
            }
            // Fetch the full song data and append
            const songItem = await fetchSongItem(supabase, newRow.id);
            if (songItem) {
              setSongs((prev) => {
                // Don't add if already present
                if (prev.some((s) => s.setlistSongId === songItem.setlistSongId)) return prev;
                return [...prev, songItem];
              });
            }
          } else if (eventType === "DELETE") {
            const oldRow = payload.old as { id: string; song_id?: string };
            const opKey = `remove:${oldRow.id}`;
            if (pendingOps.current.has(opKey)) {
              pendingOps.current.delete(opKey);
              return;
            }
            setSongs((prev) => prev.filter((s) => s.setlistSongId !== oldRow.id));
          } else if (eventType === "UPDATE") {
            const newRow = payload.new as {
              id: string;
              position: number;
              transition_notes: string | null;
            };

            // Check for reorder suppression
            if (pendingOps.current.has("reorder")) {
              // Don't suppress individual events — wait for the burst to end
              // and then clear the flag
              if (reorderTimer.current) clearTimeout(reorderTimer.current);
              reorderTimer.current = setTimeout(() => {
                pendingOps.current.delete("reorder");
              }, 200);
              return;
            }

            // Detect position change → debounced refetch
            const existing = songsRef.current.find(
              (s) => s.setlistSongId === newRow.id
            );
            if (existing && existing.position !== newRow.position) {
              if (reorderTimer.current) clearTimeout(reorderTimer.current);
              reorderTimer.current = setTimeout(() => {
                refetchAllSongs(supabase);
              }, 100);
              return;
            }

            // Transition notes update
            const transOpKey = `transition:${newRow.id}`;
            if (pendingOps.current.has(transOpKey)) {
              pendingOps.current.delete(transOpKey);
              return;
            }
            setSongs((prev) =>
              prev.map((s) =>
                s.setlistSongId === newRow.id
                  ? { ...s, transitionNotes: newRow.transition_notes ?? null }
                  : s
              )
            );
          }
        }
      )
      // Listen to songs table changes (metadata edits)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "songs",
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newRow = payload.new as {
            id: string;
            title: string;
            artist: string | null;
            duration_ms: number | null;
            bpm: number | null;
            key: string | null;
            notes: string | null;
            spotify_uri: string | null;
          };

          const opKey = `edit:${newRow.id}`;
          if (pendingOps.current.has(opKey)) {
            pendingOps.current.delete(opKey);
            return;
          }

          // Only update if this song is in our setlist
          setSongs((prev) => {
            const hasSong = prev.some((s) => s.id === newRow.id);
            if (!hasSong) return prev;
            return prev.map((s) =>
              s.id === newRow.id
                ? {
                    ...s,
                    title: newRow.title,
                    artist: newRow.artist,
                    duration_ms: newRow.duration_ms,
                    bpm: newRow.bpm,
                    key: newRow.key,
                    notes: newRow.notes,
                    spotify_uri: newRow.spotify_uri ?? null,
                  }
                : s
            );
          });
        }
      )
      .subscribe();

    return () => {
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      supabase.removeChannel(channel);
    };
  }, [setlistId, setSongs, fetchSongItem, refetchAllSongs]);

  return { markPending };
}
