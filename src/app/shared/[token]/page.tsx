import { notFound } from "next/navigation";
import Link from "next/link";
import { Music, MapPin, Calendar, Clock } from "lucide-react";
import { getSharedSetlist } from "@/actions/share-actions";
import { formatDuration, formatGigDate } from "@/lib/utils";
import { SharedSetlistEditor } from "@/components/setlist/SharedSetlistEditor";
import { SharedViewList } from "@/components/setlist/SharedViewList";
import { mapSetlistSongs } from "@/lib/types";
import type { SongItem, SetlistSongRow } from "@/lib/types";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedSetlistPage({ params }: SharedPageProps) {
  const { token } = await params;
  const result = await getSharedSetlist(token);

  if (result.error || !result.data) {
    notFound();
  }

  const setlist = result.data;
  const permission = result.permission;

  const songs = mapSetlistSongs((setlist.setlist_songs ?? []) as unknown as SetlistSongRow[]);

  const totalMs = songs.reduce(
    (sum: number, s: SongItem) => sum + (s.duration_ms ?? 0),
    0
  );

  // Edit mode — render the full editor
  if (permission === "edit") {
    return (
      <div className="min-h-dvh px-4 sm:px-6 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Music className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            CueQueue
          </span>
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
            Editing
          </span>
        </div>

        <SharedSetlistEditor
          token={token}
          setlist={{
            id: setlist.id,
            name: setlist.name,
            venue: setlist.venue,
            gig_date: setlist.gig_date,
            notes: setlist.notes,
          }}
          initialSongs={songs}
        />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Shared via{" "}
            <Link href="/" className="text-primary hover:underline">
              CueQueue
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // View mode — read-only display
  return (
    <div className="min-h-dvh px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Music className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          SetList
        </span>
      </div>

      <h1 className="text-2xl font-bold">{setlist.name}</h1>

      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
        {setlist.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {setlist.venue}
          </span>
        )}
        {setlist.gig_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatGigDate(setlist.gig_date)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {totalMs > 0 ? formatDuration(totalMs) : "No duration"}
          {" - "}
          {songs.length} {songs.length === 1 ? "song" : "songs"}
        </span>
      </div>

      {/* Song list — real-time via client component */}
      <SharedViewList setlistId={setlist.id} initialSongs={songs} />

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Shared via{" "}
          <Link href="/" className="text-primary hover:underline">
            SetList
          </Link>
        </p>
      </div>
    </div>
  );
}
