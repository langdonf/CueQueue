"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
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
}

export function SpotifySearch({ onAdd, onClose, shareToken }: SpotifySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const tokenParam = shareToken ? `&token=${encodeURIComponent(shareToken)}` : "";
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(query.trim())}${tokenParam}`
        );
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
          {results.length === 0 && query.length >= 2 && !loading && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No results found
            </p>
          )}

          {results.length === 0 && query.length < 2 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Type to search Spotify
            </p>
          )}

          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => handleAdd(track)}
              disabled={addingId === track.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50"
            >
              {/* Album art */}
              {track.albumArt && (
                <img
                  src={track.albumArt}
                  alt=""
                  className="w-10 h-10 rounded shrink-0"
                />
              )}

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{track.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {track.artist}
                </div>
              </div>

              {/* Duration */}
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {formatDurationShort(track.duration_ms)}
              </span>

              {/* Add icon */}
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
