"use client";

import { SetlistEditor, type SongItem } from "./SetlistEditor";
import {
  sharedAddSongToSetlist,
  sharedRemoveSongFromSetlist,
  sharedReorderSongs,
} from "@/actions/shared-song-actions";

interface SharedSetlistEditorProps {
  token: string;
  setlist: {
    id: string;
    name: string;
    venue: string | null;
    gig_date: string | null;
    notes: string | null;
  };
  initialSongs: SongItem[];
}

export function SharedSetlistEditor({
  token,
  setlist,
  initialSongs,
}: SharedSetlistEditorProps) {
  return (
    <SetlistEditor
      setlist={setlist}
      initialSongs={initialSongs}
      mode="shared"
      shareToken={token}
      onAddSong={(setlistId, songInput) =>
        sharedAddSongToSetlist(token, setlistId, songInput)
      }
      onRemoveSong={(setlistId, songId) =>
        sharedRemoveSongFromSetlist(token, setlistId, songId)
      }
      onReorderSongs={(setlistId, orderedSongIds) =>
        sharedReorderSongs(token, setlistId, orderedSongIds)
      }
    />
  );
}
