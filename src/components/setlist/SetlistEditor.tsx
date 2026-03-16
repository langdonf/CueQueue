"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MoreVertical, Copy, ChevronDown, ChevronRight, Pause, Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { updateSetlist, deleteSetlist, duplicateSetlist, archiveSetlist } from "@/actions/setlist-actions";
import {
  addSongToSetlist,
  removeSongFromSetlist,
  reorderSongs,
  updateSong,
  updateTransitionNotes,
} from "@/actions/song-actions";
import { SortableSongList } from "./SortableSongList";
import { AddSongModal } from "./AddSongModal";
import { EditSongModal } from "./EditSongModal";
import { SetlistDuration } from "./SetlistDuration";
import { SpotifySearch } from "@/components/spotify/SpotifySearch";
import { useRealtimeSetlist } from "@/hooks/useRealtimeSetlist";
import { PresenceBar } from "./PresenceBar";
import { toast } from "sonner";
import { formatGigDate } from "@/lib/utils";
import { BREAK_SENTINEL } from "@/lib/constants";
import type { SongItem, CreateSongInput, ActionResult } from "@/lib/types";

export type { SongItem } from "@/lib/types";

// Stable no-op for archived mode — avoids creating a new function ref on every render
const noopRemove = () => {};

type AddSongFn = (setlistId: string, songInput: CreateSongInput) => Promise<ActionResult<{ song: SongItem }>>;
type RemoveSongFn = (
  setlistId: string,
  songId: string
) => Promise<ActionResult>;
type ReorderSongsFn = (
  setlistId: string,
  orderedSongIds: string[]
) => Promise<ActionResult>;

interface SetlistEditorProps {
  setlist: {
    id: string;
    name: string;
    venue: string | null;
    gig_date: string | null;
    notes: string | null;
  };
  initialSongs: SongItem[];
  mode?: "owner" | "shared";
  /** Share token — passed to SpotifySearch so unauthenticated editors can search */
  shareToken?: string;
  defaultBreakDurationMs?: number;
  isArchived?: boolean;
  displayName?: string;
  onAddSong?: AddSongFn;
  onRemoveSong?: RemoveSongFn;
  onReorderSongs?: ReorderSongsFn;
}

export function SetlistEditor({
  setlist,
  initialSongs,
  mode = "owner",
  shareToken,
  defaultBreakDurationMs = 900000,
  isArchived = false,
  displayName,
  onAddSong,
  onRemoveSong,
  onReorderSongs,
}: SetlistEditorProps) {
  const router = useRouter();
  const [songs, setSongs] = useState<SongItem[]>(initialSongs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(setlist.name);

  // Editable metadata
  const [editingVenue, setEditingVenue] = useState(false);
  const [venue, setVenue] = useState(setlist.venue ?? "");
  const [editingDate, setEditingDate] = useState(false);
  const [gigDate, setGigDate] = useState(setlist.gig_date ?? "");

  // Notes
  const [notesExpanded, setNotesExpanded] = useState(!!setlist.notes);
  const [notes, setNotes] = useState(setlist.notes ?? "");
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit song modal
  const [editingSong, setEditingSong] = useState<SongItem | null>(null);

  // Loading states for menu actions
  const [menuLoading, setMenuLoading] = useState<string | null>(null);
  const [addingBreak, setAddingBreak] = useState(false);

  // Real-time sync
  const { markPending } = useRealtimeSetlist(setlist.id, songs, setSongs);

  const isOwner = mode === "owner";
  const isEditable = isOwner && !isArchived;

  // Stable callbacks for memoized children
  const handleEditSongOpen = useCallback((song: SongItem) => setEditingSong(song), []);
  const handleReorderStarted = useCallback(() => markPending("reorder"), [markPending]);

  // Resolve action functions — use overrides if provided, otherwise defaults
  const effectiveAddSong: AddSongFn = useMemo(
    () => onAddSong ?? ((setlistId, songInput) => addSongToSetlist(setlistId, songInput)),
    [onAddSong]
  );
  const effectiveRemoveSong: RemoveSongFn = useMemo(
    () => onRemoveSong ?? ((setlistId, songId) => removeSongFromSetlist(setlistId, songId)),
    [onRemoveSong]
  );
  const effectiveReorderSongs: ReorderSongsFn = useMemo(
    () => onReorderSongs ?? ((setlistId, orderedSongIds) => reorderSongs(setlistId, orderedSongIds)),
    [onReorderSongs]
  );

  async function handleNameSave() {
    setEditingName(false);
    if (name !== setlist.name) {
      const result = await updateSetlist(setlist.id, { name });
      if ("error" in result) {
        toast.error(result.error);
        setName(setlist.name);
      }
    }
  }

  async function handleVenueSave() {
    setEditingVenue(false);
    const newVenue = venue.trim() || null;
    if (newVenue !== setlist.venue) {
      const result = await updateSetlist(setlist.id, { venue: newVenue });
      if ("error" in result) {
        toast.error(result.error);
        setVenue(setlist.venue ?? "");
      }
    }
  }

  async function handleDateSave() {
    setEditingDate(false);
    const newDate = gigDate || null;
    if (newDate !== setlist.gig_date) {
      const result = await updateSetlist(setlist.id, { gig_date: newDate });
      if ("error" in result) {
        toast.error(result.error);
        setGigDate(setlist.gig_date ?? "");
      }
    }
  }

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(async () => {
      const result = await updateSetlist(setlist.id, { notes: value || null });
      if ("error" in result) toast.error(result.error);
    }, 500);
  }, [setlist.id]);

  async function handleAddSong(songInput: {
    title: string;
    artist?: string;
    duration_ms?: number;
    bpm?: number;
    key?: string;
    notes?: string;
    spotify_track_id?: string;
    spotify_uri?: string;
  }) {
    const result = await effectiveAddSong(setlist.id, songInput);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    markPending(`add:${result.data.song.id}`);
    setSongs((prev) => [...prev, result.data.song]);
    setShowAddModal(false);
    setShowSpotify(false);
  }

  const handleRemoveSong = useCallback(async (songId: string) => {
    setSongs((prev) => {
      const songToRemove = prev.find((s) => s.id === songId);
      if (songToRemove) markPending(`remove:${songToRemove.setlistSongId}`);
      return prev.filter((s) => s.id !== songId);
    });
    const result = await effectiveRemoveSong(setlist.id, songId);
    if ("error" in result) {
      toast.error(result.error);
      router.refresh();
    }
  }, [setlist.id, effectiveRemoveSong, markPending, router]);

  async function handleEditSong(songId: string, input: {
    title?: string;
    artist?: string | null;
    duration_ms?: number | null;
    bpm?: number | null;
    key?: string | null;
    notes?: string | null;
  }) {
    markPending(`edit:${songId}`);
    // Optimistic update
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, ...input } : s))
    );
    const result = await updateSong(songId, input);
    if ("error" in result) {
      toast.error(result.error);
      router.refresh();
    }
  }

  async function handleUpdateTransitionNotes(setlistSongId: string, songId: string, transNotes: string | null) {
    markPending(`transition:${setlistSongId}`);
    setSongs((prev) =>
      prev.map((s) => (s.setlistSongId === setlistSongId ? { ...s, transitionNotes: transNotes } : s))
    );
    const result = await updateTransitionNotes(setlistSongId, transNotes);
    if ("error" in result) {
      toast.error(result.error);
      router.refresh();
    }
  }

  async function handleAddBreak() {
    setAddingBreak(true);
    const result = await effectiveAddSong(setlist.id, {
      title: BREAK_SENTINEL,
      duration_ms: defaultBreakDurationMs,
    });
    setAddingBreak(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    markPending(`add:${result.data.song.id}`);
    setSongs((prev) => [...prev, result.data.song]);
  }

  async function handleDelete() {
    if (!confirm("Delete this setlist? This cannot be undone.")) return;
    setMenuLoading("delete");
    const result = await deleteSetlist(setlist.id);
    if ("error" in result) {
      toast.error(result.error);
      setMenuLoading(null);
      return;
    }
    toast.success("Setlist deleted");
    router.push("/setlists");
  }

  async function handleArchive() {
    setMenuLoading("archive");
    const result = await archiveSetlist(setlist.id, !isArchived);
    if ("error" in result) {
      toast.error(result.error);
      setMenuLoading(null);
      return;
    }
    toast.success(isArchived ? "Setlist unarchived" : "Setlist archived");
    router.push("/setlists");
  }

  async function handleDuplicate() {
    setMenuLoading("duplicate");
    const result = await duplicateSetlist(setlist.id);
    if ("error" in result) {
      toast.error(result.error);
      setMenuLoading(null);
      return;
    }
    toast.success("Setlist duplicated");
    router.push(`/setlists/${result.data.id}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        {isEditable && editingName ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
            autoFocus
            className="text-2xl font-bold bg-transparent border-b-2 border-primary outline-none w-full"
          />
        ) : (
          <div className="flex items-start justify-between">
            {isEditable ? (
              <button
                onClick={() => setEditingName(true)}
                className="text-2xl font-bold text-left hover:text-primary transition-colors"
              >
                {name}
              </button>
            ) : (
              <h1 className="text-2xl font-bold">{name}</h1>
            )}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-10">
                    {!isArchived && (
                      <button
                        onClick={handleDuplicate}
                        disabled={!!menuLoading}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {menuLoading === "duplicate" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {menuLoading === "duplicate" ? "Duplicating..." : "Duplicate"}
                      </button>
                    )}
                    <button
                      onClick={handleArchive}
                      disabled={!!menuLoading}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {menuLoading === "archive" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isArchived ? (
                        <ArchiveRestore className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                      {menuLoading === "archive"
                        ? (isArchived ? "Unarchiving..." : "Archiving...")
                        : (isArchived ? "Unarchive" : "Archive")}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={!!menuLoading}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {menuLoading === "delete" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {menuLoading === "delete" ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Editable venue & date */}
        {isEditable ? (
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {editingVenue ? (
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                onBlur={handleVenueSave}
                onKeyDown={(e) => e.key === "Enter" && handleVenueSave()}
                autoFocus
                placeholder="Add venue..."
                className="bg-transparent border-b border-primary outline-none text-foreground"
              />
            ) : (
              <button
                onClick={() => setEditingVenue(true)}
                className="hover:text-foreground transition-colors"
              >
                {venue || "Add venue..."}
              </button>
            )}
            <span className="text-border">|</span>
            {editingDate ? (
              <input
                type="date"
                value={gigDate}
                onChange={(e) => {
                  setGigDate(e.target.value);
                }}
                onBlur={handleDateSave}
                autoFocus
                className="bg-transparent border-b border-primary outline-none text-foreground"
              />
            ) : (
              <button
                onClick={() => setEditingDate(true)}
                className="hover:text-foreground transition-colors"
              >
                {gigDate ? formatGigDate(gigDate) : "Add date..."}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {setlist.venue && <span>{setlist.venue}</span>}
            {setlist.venue && setlist.gig_date && (
              <span className="text-border">|</span>
            )}
            {setlist.gig_date && (
              <span>{formatGigDate(setlist.gig_date)}</span>
            )}
          </div>
        )}

        {/* Collapsible notes */}
        {isEditable && (
          <div className="mt-3">
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {notesExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              {notes ? "Notes" : "Add notes..."}
            </button>
            {notesExpanded && (
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Setlist notes — e.g. 'Start acoustic, switch to electric after song 3'"
                rows={3}
                className="mt-2 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            )}
          </div>
        )}

        {/* Read-only notes for archived setlists */}
        {isArchived && notes && (
          <div className="mt-3 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
            {notes}
          </div>
        )}
      </div>

      {/* Presence indicators */}
      <PresenceBar setlistId={setlist.id} mode={isOwner ? "editing" : "editing"} displayName={displayName} />

      {/* Duration bar */}
      <SetlistDuration songs={songs} />

      {/* Archived banner */}
      {isArchived && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
          <Archive className="w-4 h-4 shrink-0" />
          This setlist is archived. Unarchive it to make changes.
        </div>
      )}

      {/* Song list */}
      <SortableSongList
        songs={songs}
        setSongs={setSongs}
        setlistId={setlist.id}
        onRemoveSong={isArchived ? noopRemove : handleRemoveSong}
        onEditSong={isArchived ? undefined : handleEditSongOpen}
        reorderSongs={effectiveReorderSongs}
        onReorderStarted={handleReorderStarted}
        readOnly={isArchived}
      />

      {/* Add song buttons */}
      {!isArchived && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Song
          </button>
          <button
            onClick={() => setShowSpotify(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Spotify
          </button>
          <button
            onClick={handleAddBreak}
            disabled={addingBreak}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50"
            title="Add set break"
          >
            {addingBreak ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSongModal
          onAdd={handleAddSong}
          onClose={() => setShowAddModal(false)}
          setlistId={setlist.id}
        />
      )}

      {showSpotify && (
        <SpotifySearch
          onAdd={handleAddSong}
          onClose={() => setShowSpotify(false)}
          shareToken={shareToken}
        />
      )}

      {editingSong && (
        <EditSongModal
          song={editingSong}
          onSave={async (input) => {
            await handleEditSong(editingSong.id, input);
            setEditingSong(null);
          }}
          onUpdateTransitionNotes={async (transNotes) => {
            await handleUpdateTransitionNotes(editingSong.setlistSongId, editingSong.id, transNotes);
          }}
          onClose={() => setEditingSong(null)}
        />
      )}
    </div>
  );
}
