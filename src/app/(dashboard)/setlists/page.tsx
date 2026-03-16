import Link from "next/link";
import { Plus, ListMusic } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SetlistCard } from "@/components/setlist/SetlistCard";
import { ArchiveToggle } from "@/components/setlist/ArchiveToggle";

export const dynamic = "force-dynamic";

interface SetlistsPageProps {
  searchParams: Promise<{ show?: string }>;
}

export default async function SetlistsPage({ searchParams }: SetlistsPageProps) {
  const params = await searchParams;
  const showArchived = params.show === "archived";
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("setlists")
    .select(
      `
      *,
      setlist_songs(count)
    `
    )
    .order("updated_at", { ascending: false });

  // Filter by archive status
  if (showArchived) {
    query.eq("is_archived", true);
  } else {
    query.eq("is_archived", false);
  }

  const { data: setlists } = await query;

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Setlists</h1>
        <Link
          href="/setlists/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </Link>
      </div>

      {/* Archive filter toggle */}
      <ArchiveToggle showArchived={showArchived} />

      {!setlists || setlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ListMusic className="w-12 h-12 text-muted-foreground mb-4" />
          {showArchived ? (
            <>
              <h2 className="text-lg font-semibold mb-2">No archived setlists</h2>
              <p className="text-muted-foreground">
                Archived setlists will appear here.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-2">No setlists yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first setlist to get started.
              </p>
              <Link
                href="/setlists/new"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Setlist
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {setlists.map((setlist) => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              songCount={setlist.setlist_songs?.[0]?.count ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
