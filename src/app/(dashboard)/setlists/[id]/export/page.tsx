import { notFound } from "next/navigation";
import { getSetlist } from "@/actions/setlist-actions";
import { ExportView } from "./export-view";
import { mapSetlistSongs } from "@/lib/types";

interface ExportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExportPage({ params }: ExportPageProps) {
  const { id } = await params;
  const result = await getSetlist(id);

  if (!("data" in result) || !result.data) {
    notFound();
  }

  const setlist = result.data;
  const songs = mapSetlistSongs(setlist.setlist_songs ?? []);

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
