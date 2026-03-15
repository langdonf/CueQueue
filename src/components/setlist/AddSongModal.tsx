"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Library } from "lucide-react";
import { getLibrarySongs } from "@/actions/song-actions";
import { formatDurationShort, splitDurationMs, parseDurationInputs } from "@/lib/utils";
import { ModalShell } from "@/components/ui/ModalShell";
import { BREAK_SENTINEL } from "@/lib/constants";

interface LibrarySong {
  id: string;
  title: string;
  artist: string | null;
  duration_ms: number | null;
  bpm: number | null;
  key: string | null;
  notes: string | null;
}

interface AddSongModalProps {
  onAdd: (song: {
    title: string;
    artist?: string;
    duration_ms?: number;
    bpm?: number;
    key?: string;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
  setlistId?: string;
}

export function AddSongModal({ onAdd, onClose }: AddSongModalProps) {
  const [loading, setLoading] = useState(false);
  const [librarySongs, setLibrarySongs] = useState<LibrarySong[]>([]);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [showLibrary, setShowLibrary] = useState(true);
  const [prefilled, setPrefilled] = useState<LibrarySong | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch library on mount
  useEffect(() => {
    getLibrarySongs().then((result) => {
      if ("error" in result) {
        console.warn("Failed to load library songs:", result.error);
        return;
      }
      if (result.data.songs.length > 0) {
        setLibrarySongs(result.data.songs as LibrarySong[]);
      }
    });
  }, []);

  function handlePrefill(song: LibrarySong) {
    setPrefilled(song);
    setShowLibrary(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const durationMs = parseDurationInputs(
      form.get("duration_min") as string,
      form.get("duration_sec") as string
    );

    await onAdd({
      title: form.get("title") as string,
      artist: (form.get("artist") as string) || undefined,
      duration_ms: durationMs ?? undefined,
      bpm: parseInt(form.get("bpm") as string) || undefined,
      key: (form.get("key") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    });

    setLoading(false);
  }

  const filteredLibrary = librarySongs.filter((song) => {
    if (song.title === BREAK_SENTINEL) return false;
    if (!libraryFilter) return true;
    const q = libraryFilter.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      (song.artist && song.artist.toLowerCase().includes(q))
    );
  });

  const { min: durationMin, sec: durationSec } = splitDurationMs(prefilled?.duration_ms ?? null);

  return (
    <ModalShell title="Add Song" onClose={onClose}>
      {/* Library section */}
      {librarySongs.length > 0 && showLibrary && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Library className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Your Library
            </span>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              placeholder="Search your songs..."
              className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
            {filteredLibrary.slice(0, 20).map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => handlePrefill(song)}
                className="flex items-center gap-2 px-2.5 py-2 text-left rounded-md hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {song.title}
                  </div>
                  {song.artist && (
                    <div className="text-xs text-muted-foreground truncate">
                      {song.artist}
                    </div>
                  )}
                </div>
                {song.duration_ms && (
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {formatDurationShort(song.duration_ms)}
                  </span>
                )}
              </button>
            ))}
            {filteredLibrary.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No matching songs
              </p>
            )}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setShowLibrary(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Or add a new song manually →
            </button>
          </div>
        </div>
      )}

      {/* Show library toggle when hidden */}
      {librarySongs.length > 0 && !showLibrary && (
        <button
          type="button"
          onClick={() => {
            setShowLibrary(true);
            setPrefilled(null);
          }}
          className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Library className="w-3.5 h-3.5" />
          Browse your library
        </button>
      )}

      <form
        ref={formRef}
        key={prefilled?.id ?? "empty"}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            name="title"
            type="text"
            required
            defaultValue={prefilled?.title ?? ""}
            placeholder="Song title"
            className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Artist</label>
          <input
            name="artist"
            type="text"
            defaultValue={prefilled?.artist ?? ""}
            placeholder="Artist name"
            className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Duration</label>
          <div className="flex items-center gap-2">
            <input
              name="duration_min"
              type="number"
              min="0"
              max="99"
              defaultValue={durationMin}
              placeholder="min"
              className="w-20 px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <span className="text-muted-foreground">:</span>
            <input
              name="duration_sec"
              type="number"
              min="0"
              max="59"
              defaultValue={durationSec}
              placeholder="sec"
              className="w-20 px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Key</label>
            <input
              name="key"
              type="text"
              defaultValue={prefilled?.key ?? ""}
              placeholder="e.g. Am"
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">BPM</label>
            <input
              name="bpm"
              type="number"
              min="1"
              max="999"
              defaultValue={prefilled?.bpm ?? ""}
              placeholder="120"
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={prefilled?.notes ?? ""}
            placeholder="Performance notes..."
            className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-1 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Song"}
        </button>
      </form>
    </ModalShell>
  );
}
