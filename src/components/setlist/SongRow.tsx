import { GripVertical, X } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";
import type { SongItem } from "./SetlistEditor";

interface SongRowProps {
  song: SongItem;
  index: number;
  onRemove: (songId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function SongRow({ song, index, onRemove, dragHandleProps }: SongRowProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-3 bg-card border border-border rounded-lg group">
      {/* Drag handle */}
      <button
        className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...dragHandleProps}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Position number */}
      <span className="w-6 text-center text-xs text-muted-foreground font-mono">
        {index + 1}
      </span>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{song.title}</div>
        {song.artist && (
          <div className="text-xs text-muted-foreground truncate">
            {song.artist}
          </div>
        )}
      </div>

      {/* Metadata badges */}
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

      {/* Remove button */}
      <button
        onClick={() => onRemove(song.id)}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Remove ${song.title}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
