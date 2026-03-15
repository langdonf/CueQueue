"use client";

import { useState } from "react";
import { useRealtimeSetlist } from "@/hooks/useRealtimeSetlist";
import { formatDurationShort } from "@/lib/utils";
import type { SongItem } from "@/lib/types";

interface SharedViewListProps {
  setlistId: string;
  initialSongs: SongItem[];
}

export function SharedViewList({ setlistId, initialSongs }: SharedViewListProps) {
  const [songs, setSongs] = useState<SongItem[]>(initialSongs);

  // Real-time sync (read-only)
  useRealtimeSetlist(setlistId, songs, setSongs);

  return (
    <div className="mt-6 flex flex-col gap-2">
      {songs.map((song, index) => (
        <div
          key={song.setlistSongId}
          className="flex items-center gap-3 px-3 py-3 bg-card border border-border rounded-lg"
        >
          <span className="w-6 text-center text-xs text-muted-foreground font-mono">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{song.title}</div>
            {song.artist && (
              <div className="text-xs text-muted-foreground truncate">
                {song.artist}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {song.key && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded text-muted-foreground">
                {song.key}
              </span>
            )}
            {song.bpm && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded text-muted-foreground">
                {song.bpm}
              </span>
            )}
            {song.duration_ms && (
              <span className="text-xs text-muted-foreground font-mono">
                {formatDurationShort(song.duration_ms)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
