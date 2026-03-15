import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Radio, Share2, FileDown } from "lucide-react";
import { getSetlist } from "@/actions/setlist-actions";
import { SetlistEditor } from "@/components/setlist/SetlistEditor";

interface SetlistPageProps {
  params: Promise<{ id: string }>;
}

export default async function SetlistPage({ params }: SetlistPageProps) {
  const { id } = await params;
  const result = await getSetlist(id);

  if (result.error || !result.data) {
    notFound();
  }

  const setlist = result.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const songs = (setlist.setlist_songs ?? []).map((ss: any) => ({
    setlistSongId: ss.id,
    position: ss.position,
    transitionNotes: ss.transition_notes,
    ...ss.song,
  }));

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/setlists"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/setlists/${id}/export`}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Export setlist"
          >
            <FileDown className="w-5 h-5" />
          </Link>
          <Link
            href={`/setlists/${id}/share`}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Share setlist"
          >
            <Share2 className="w-5 h-5" />
          </Link>
          <Link
            href={`/setlists/${id}/live`}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Radio className="w-4 h-4" />
            Live
          </Link>
        </div>
      </div>

      <SetlistEditor setlist={setlist} initialSongs={songs} />
    </div>
  );
}
