"use client";

import { memo, useCallback, useId } from "react";
import {
  DndContext,
  closestCenter,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { SongRow } from "./SongRow";
import { toast } from "sonner";
import type { SongItem } from "@/lib/types";
import { ListMusic } from "lucide-react";

interface SortableSongListProps {
  songs: SongItem[];
  setSongs: React.Dispatch<React.SetStateAction<SongItem[]>>;
  setlistId: string;
  onRemoveSong: (songId: string) => void;
  onEditSong?: (song: SongItem) => void;
  onBreakDurationChange?: (songId: string, durationMs: number) => void;
  reorderSongs: (
    setlistId: string,
    orderedSongIds: string[]
  ) => Promise<{ error?: string; success?: boolean }>;
  onReorderStarted?: () => void;
  readOnly?: boolean;
  notesExpanded?: boolean;
  onSaveNotes?: (songId: string, notes: string | null) => void;
}

const SortableSongRow = memo(function SortableSongRow({
  song,
  index,
  onRemove,
  onEdit,
  onBreakDurationChange,
  readOnly,
  notesExpanded,
  onSaveNotes,
}: {
  song: SongItem;
  index: number;
  onRemove: (songId: string) => void;
  onEdit?: (song: SongItem) => void;
  onBreakDurationChange?: (songId: string, durationMs: number) => void;
  readOnly?: boolean;
  notesExpanded?: boolean;
  onSaveNotes?: (songId: string, notes: string | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SongRow
        song={song}
        index={index}
        onRemove={readOnly ? undefined : onRemove}
        onEdit={onEdit}
        onBreakDurationChange={readOnly ? undefined : onBreakDurationChange}
        dragHandleProps={readOnly ? undefined : listeners}
        notesExpanded={notesExpanded}
        onSaveNotes={onSaveNotes}
        readOnly={readOnly}
      />
    </div>
  );
});

export function SortableSongList({
  songs,
  setSongs,
  setlistId,
  onRemoveSong,
  onEditSong,
  onBreakDurationChange,
  reorderSongs,
  onReorderStarted,
  readOnly = false,
  notesExpanded,
  onSaveNotes,
}: SortableSongListProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = songs.findIndex((s) => s.id === active.id);
      const newIndex = songs.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(songs, oldIndex, newIndex);
      setSongs(reordered);
      onReorderStarted?.();

      const orderedIds = reordered.map((s) => s.id);
      const result = await reorderSongs(setlistId, orderedIds);
      if (result.error) {
        toast.error("Failed to save order");
        setSongs(songs); // revert
      }
    },
    [songs, setSongs, setlistId, reorderSongs, onReorderStarted]
  );

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <ListMusic className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No songs yet. Add one below.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={songs.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {songs.map((song, index) => (
            <SortableSongRow
              key={song.id}
              song={song}
              index={index}
              onRemove={onRemoveSong}
              onEdit={onEditSong}
              onBreakDurationChange={onBreakDurationChange}
              readOnly={readOnly}
              notesExpanded={notesExpanded}
              onSaveNotes={onSaveNotes}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
