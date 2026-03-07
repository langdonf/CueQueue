import Link from "next/link";
import { MapPin, Calendar, Music } from "lucide-react";
import { format } from "date-fns";

interface SetlistCardProps {
  setlist: {
    id: string;
    name: string;
    venue: string | null;
    gig_date: string | null;
    updated_at: string;
  };
  songCount: number;
}

export function SetlistCard({ setlist, songCount }: SetlistCardProps) {
  return (
    <Link
      href={`/setlists/${setlist.id}`}
      className="block p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
    >
      <h3 className="font-semibold text-lg truncate">{setlist.name}</h3>

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
            <span>{format(new Date(setlist.gig_date), "MMM d, yyyy")}</span>
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
  );
}
