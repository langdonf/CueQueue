"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Music, MoreVertical, Copy, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { formatGigDate } from "@/lib/utils";
import { deleteSetlist, duplicateSetlist, archiveSetlist } from "@/actions/setlist-actions";
import { toast } from "sonner";

interface SetlistCardProps {
  setlist: {
    id: string;
    name: string;
    venue: string | null;
    gig_date: string | null;
    updated_at: string;
    is_archived?: boolean;
  };
  songCount: number;
}

export function SetlistCard({ setlist, songCount }: SetlistCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isArchived = setlist.is_archived ?? false;

  async function handleDuplicate() {
    setShowMenu(false);
    const result = await duplicateSetlist(setlist.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.id) {
      toast.success("Setlist duplicated");
      router.push(`/setlists/${result.id}`);
    }
  }

  async function handleArchive() {
    setShowMenu(false);
    const result = await archiveSetlist(setlist.id, !isArchived);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(isArchived ? "Setlist unarchived" : "Setlist archived");
    router.refresh();
  }

  async function handleDelete() {
    setShowMenu(false);
    if (!confirm("Delete this setlist? This cannot be undone.")) return;
    const result = await deleteSetlist(setlist.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Setlist deleted");
    router.refresh();
  }

  return (
    <div className={`relative block p-4 bg-card border border-border rounded-xl transition-colors ${isArchived ? "opacity-60" : "hover:border-primary/50"}`}>
      <Link href={`/setlists/${setlist.id}`} className="block">
        <h3 className="font-semibold text-lg truncate pr-8">{setlist.name}</h3>

        <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
          {setlist.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{setlist.venue}</span>
            </div>
          )}
          {setlist.gig_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatGigDate(setlist.gig_date)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 shrink-0" />
            <span>
              {songCount} {songCount === 1 ? "song" : "songs"}
            </span>
          </div>
        </div>
      </Link>

      {/* Three-dot menu */}
      <div className="absolute top-3 right-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-20">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDuplicate();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleArchive();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {isArchived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                {isArchived ? "Unarchive" : "Archive"}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
