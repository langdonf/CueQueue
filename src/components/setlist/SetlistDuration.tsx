import { memo } from "react";
import { Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { SongItem } from "@/lib/types";

interface SetlistDurationProps {
  songs: SongItem[];
}

export const SetlistDuration = memo(function SetlistDuration({ songs }: SetlistDurationProps) {
  const totalMs = songs.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
  const songsWithDuration = songs.filter((s) => s.duration_ms);

  return (
    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-secondary rounded-lg text-sm">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium">
        {totalMs > 0 ? formatDuration(totalMs) : "0m 00s"}
      </span>
      <span className="text-muted-foreground">
        {songs.length} {songs.length === 1 ? "song" : "songs"}
        {songsWithDuration.length < songs.length &&
          songsWithDuration.length > 0 &&
          ` (${songs.length - songsWithDuration.length} without duration)`}
      </span>
    </div>
  );
});
