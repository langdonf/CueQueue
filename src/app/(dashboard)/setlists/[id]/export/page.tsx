import { notFound } from "next/navigation";
import { getSetlist } from "@/actions/setlist-actions";
import { ExportView } from "./export-view";

interface ExportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExportPage({ params }: ExportPageProps) {
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
    <ExportView
      setlist={{
        name: setlist.name,
        venue: setlist.venue,
        gig_date: setlist.gig_date,
        notes: setlist.notes,
      }}
      songs={songs}
      setlistId={id}
    />
  );
}
