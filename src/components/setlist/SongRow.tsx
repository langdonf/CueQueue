import { memo } from "react";
import { GripVertical, X, ArrowRight } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";
import type { SongItem } from "@/lib/types";
import { BREAK_SENTINEL } from "@/lib/constants";
import { InlineSongNotes } from "./InlineSongNotes";
import { BreakDurationSlider } from "./BreakDurationSlider";

interface SongRowProps {
  song: SongItem;
  index: number;
  onRemove?: (songId: string) => void;
  onEdit?: (song: SongItem) => void;
  onBreakDurationChange?: (songId: string, durationMs: number) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  notesExpanded?: boolean;
  onSaveNotes?: (songId: string, notes: string | null) => void;
  readOnly?: boolean;
}

export const SongRow = memo(function SongRow({ song, index, onRemove, onEdit, onBreakDurationChange, dragHandleProps, notesExpanded, onSaveNotes, readOnly }: SongRowProps) {
  const isBreak = song.title === BREAK_SENTINEL;

  if (isBreak) {
    return (
      <div className="flex flex-col gap-1.5 px-2 py-2 bg-muted/50 border border-dashed border-border rounded-lg">
        <div className="flex items-center gap-2">
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
        {onBreakDurationChange && song.duration_ms && (
          <div className="px-1">
            <BreakDurationSlider
              durationMs={song.duration_ms}
              onChange={(ms) => onBreakDurationChange(song.id, ms)}
            />
          </div>
        )}
        {!onBreakDurationChange && song.duration_ms && (
          <span className="text-xs text-muted-foreground font-mono text-center">
            {formatDurationShort(song.duration_ms)}
          </span>
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

      {/* Inline song notes */}
      {notesExpanded && onSaveNotes && (
        <InlineSongNotes
          songId={song.id}
          initialNotes={song.notes ?? ""}
          onSave={onSaveNotes}
          readOnly={readOnly}
        />
      )}

      {/* Read-only notes for archived/shared views */}
      {notesExpanded && !onSaveNotes && song.notes && (
        <div className="px-4 pb-1 text-xs text-muted-foreground whitespace-pre-wrap">
          {song.notes}
        </div>
      )}

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
