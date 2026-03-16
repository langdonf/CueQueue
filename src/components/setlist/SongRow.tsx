import { memo } from "react";
import { GripVertical, X, ArrowRight } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";
import type { SongItem } from "@/lib/types";
import { BREAK_SENTINEL } from "@/lib/constants";

interface SongRowProps {
  song: SongItem;
  index: number;
  onRemove?: (songId: string) => void;
  onEdit?: (song: SongItem) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export const SongRow = memo(function SongRow({ song, index, onRemove, onEdit, dragHandleProps }: SongRowProps) {
  const isBreak = song.title === BREAK_SENTINEL;

  if (isBreak) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 bg-muted/50 border border-dashed border-border rounded-lg">
        {dragHandleProps && (
          <button
            className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
            Set Break
            {song.duration_ms && (
              <span className="ml-1 font-mono">
                ({formatDurationShort(song.duration_ms)})
              </span>
            )}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(song.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove break"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-3 bg-card border border-border rounded-lg group">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Position number */}
        <span className="w-6 text-center text-xs text-muted-foreground font-mono">
          {index + 1}
        </span>

        {/* Song info — clickable to edit */}
        <button
          onClick={() => onEdit?.(song)}
          className="flex-1 min-w-0 text-left hover:text-primary transition-colors"
        >
          <div className="font-medium text-sm truncate">{song.title}</div>
          {song.artist && (
            <div className="text-xs text-muted-foreground truncate">
              {song.artist}
            </div>
          )}
        </button>

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
        {onRemove && (
          <button
            onClick={() => onRemove(song.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Remove ${song.title}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Transition notes */}
      {song.transitionNotes && (
        <div className="flex items-center gap-1.5 px-4 py-1 text-xs text-muted-foreground italic">
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span>{song.transitionNotes}</span>
        </div>
      )}
    </div>
  );
});
