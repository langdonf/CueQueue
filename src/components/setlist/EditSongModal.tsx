"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { SongItem } from "./SetlistEditor";

interface EditSongModalProps {
  song: SongItem;
  onSave: (input: {
    title?: string;
    artist?: string | null;
    duration_ms?: number | null;
    bpm?: number | null;
    key?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  onUpdateTransitionNotes: (notes: string | null) => Promise<void>;
  onClose: () => void;
}

export function EditSongModal({ song, onSave, onUpdateTransitionNotes, onClose }: EditSongModalProps) {
  const [loading, setLoading] = useState(false);
  const [transNotes, setTransNotes] = useState(song.transitionNotes ?? "");

  const durationMin = song.duration_ms ? Math.floor(song.duration_ms / 60000) : "";
  const durationSec = song.duration_ms ? Math.floor((song.duration_ms % 60000) / 1000) : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const durMin = parseInt(form.get("duration_min") as string) || 0;
    const durSec = parseInt(form.get("duration_sec") as string) || 0;
    const durationMs =
      durMin > 0 || durSec > 0
        ? (durMin * 60 + durSec) * 1000
        : null;

    await onSave({
      title: form.get("title") as string,
      artist: (form.get("artist") as string) || null,
      duration_ms: durationMs,
      bpm: parseInt(form.get("bpm") as string) || null,
      key: (form.get("key") as string) || null,
      notes: (form.get("notes") as string) || null,
    });

    // Also save transition notes if changed
    const newTransNotes = transNotes.trim() || null;
    if (newTransNotes !== song.transitionNotes) {
      await onUpdateTransitionNotes(newTransNotes);
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Song</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              defaultValue={song.title}
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Artist</label>
            <input
              name="artist"
              type="text"
              defaultValue={song.artist ?? ""}
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
                defaultValue={song.key ?? ""}
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
                defaultValue={song.bpm ?? ""}
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
              defaultValue={song.notes ?? ""}
              placeholder="Performance notes..."
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Transition to next song
            </label>
            <input
              type="text"
              value={transNotes}
              onChange={(e) => setTransNotes(e.target.value)}
              placeholder="e.g. Segue directly, Tune to drop-D"
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-1 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
