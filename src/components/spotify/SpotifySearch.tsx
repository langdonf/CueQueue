"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { Search, X, Plus, Loader2, Library } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";

interface SpotifyTrackResult {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  duration_ms: number;
  uri: string;
}

interface LibrarySong {
  id: string;
  title: string;
  artist: string | null;
  duration_ms: number | null;
  spotify_uri: string | null;
}

interface SpotifySearchProps {
  onAdd: (song: {
    title: string;
    artist?: string;
    duration_ms?: number;
    spotify_track_id?: string;
    spotify_uri?: string;
  }) => Promise<void>;
  onClose: () => void;
  /** Share token for unauthenticated editors (passed as query param to API) */
  shareToken?: string;
  /** Current setlist ID — used to filter out songs already in this setlist */
  setlistId?: string;
}

export function SpotifySearch({ onAdd, onClose, shareToken, setlistId }: SpotifySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [allLibrary, setAllLibrary] = useState<LibrarySong[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch full library once on mount
  useEffect(() => {
    async function fetchLibrary() {
      try {
        const params = new URLSearchParams();
        if (setlistId) params.set("setlistId", setlistId);
        const res = await fetch(`/api/spotify/search?${params}`);
        const data = await res.json();
        setAllLibrary(data.library ?? []);
      } catch {
        // Silently fail — library section just won't show
      }
    }
    fetchLibrary();
  }, [setlistId]);

  // Filter library client-side based on query (instant, no network)
  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return allLibrary;
    return allLibrary.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        (song.artist ?? "").toLowerCase().includes(q)
    );
  }, [query, allLibrary]);

  // Debounced Spotify search (only fires at 2+ chars)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (shareToken) params.set("token", shareToken);
        const res = await fetch(`/api/spotify/search?${params}`);
        const data = await res.json();
        setResults(data.tracks ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, shareToken]);

  async function handleAdd(track: SpotifyTrackResult) {
    setAddingId(track.id);
    await onAdd({
      title: track.name,
      artist: track.artist,
      duration_ms: track.duration_ms,
      spotify_track_id: track.id,
      spotify_uri: track.uri,
    });
    setAddingId(null);
  }

  async function handleAddLibrary(song: LibrarySong) {
    setAddingId(song.id);
    await onAdd({
      title: song.title,
      artist: song.artist ?? undefined,
      duration_ms: song.duration_ms ?? undefined,
      spotify_uri: song.spotify_uri ?? undefined,
    });
    // Remove from library list after adding
    setAllLibrary((prev) => prev.filter((s) => s.id !== song.id));
    setAddingId(null);
  }

  const hasResults = results.length > 0 || filteredLibrary.length > 0;
  const noResults = !hasResults && query.length >= 2 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-12 sm:pt-0">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl mx-4 sm:mx-0 max-h-[70dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Spotify..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {noResults && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No results found
            </p>
          )}

          {!hasResults && query.length < 2 && !loading && allLibrary.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Type to search Spotify
            </p>
          )}

          {/* Library matches */}
          {filteredLibrary.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-2 pt-1 pb-2">
                <Library className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">From your library</span>
              </div>
              {filteredLibrary.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleAddLibrary(song)}
                  disabled={addingId === song.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <Library className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{song.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {song.artist ?? "Unknown artist"}
                    </div>
                  </div>

                  {song.duration_ms && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {formatDurationShort(song.duration_ms)}
                    </span>
                  )}

                  <span className="p-1.5 text-primary shrink-0">
                    {addingId === song.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </span>
                </button>
              ))}

              {/* Divider between library and Spotify results */}
              {results.length > 0 && (
                <div className="flex items-center gap-2 px-2 pt-3 pb-2">
                  <span className="text-xs font-medium text-muted-foreground">Spotify</span>
                </div>
              )}
            </>
          )}

          {/* Spotify results */}
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => handleAdd(track)}
              disabled={addingId === track.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50"
            >
              {track.albumArt ? (
                <Image
                  src={track.albumArt}
                  alt={`${track.name} album art`}
                  width={40}
                  height={40}
                  className="rounded shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{track.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {track.artist}
                </div>
              </div>

              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {formatDurationShort(track.duration_ms)}
              </span>

              <span className="p-1.5 text-primary shrink-0">
                {addingId === track.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
