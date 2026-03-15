"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Copy, Check } from "lucide-react";
import { useState } from "react";
import { formatGigDate, formatDurationShort } from "@/lib/utils";
import { BREAK_SENTINEL } from "@/components/setlist/SetlistEditor";

interface ExportSong {
  id: string;
  title: string;
  artist: string | null;
  duration_ms: number | null;
  key: string | null;
  bpm: number | null;
  transitionNotes: string | null;
}

interface ExportViewProps {
  setlist: {
    name: string;
    venue: string | null;
    gig_date: string | null;
    notes: string | null;
  };
  songs: ExportSong[];
  setlistId: string;
}

export function ExportView({ setlist, songs, setlistId }: ExportViewProps) {
  const [copied, setCopied] = useState(false);

  const totalMs = songs.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);

  function generateText() {
    const lines: string[] = [];
    lines.push(setlist.name);
    lines.push("=".repeat(setlist.name.length));
    if (setlist.venue || setlist.gig_date) {
      const parts: string[] = [];
      if (setlist.venue) parts.push(setlist.venue);
      if (setlist.gig_date) parts.push(formatGigDate(setlist.gig_date));
      lines.push(parts.join(" — "));
    }
    lines.push("");

    let songNum = 0;
    for (const song of songs) {
      if (song.title === BREAK_SENTINEL) {
        lines.push("--- Set Break ---");
        lines.push("");
        continue;
      }
      songNum++;
      const meta: string[] = [];
      if (song.key) meta.push(song.key);
      if (song.bpm) meta.push(`${song.bpm} BPM`);
      if (song.duration_ms) meta.push(formatDurationShort(song.duration_ms));

      let line = `${songNum}. ${song.title}`;
      if (song.artist) line += ` — ${song.artist}`;
      if (meta.length > 0) line += `  [${meta.join(", ")}]`;
      lines.push(line);

      if (song.transitionNotes) {
        lines.push(`   → ${song.transitionNotes}`);
      }
    }

    if (totalMs > 0) {
      lines.push("");
      const totalMin = Math.floor(totalMs / 60000);
      lines.push(`Total: ${totalMin} min`);
    }

    if (setlist.notes) {
      lines.push("");
      lines.push("Notes:");
      lines.push(setlist.notes);
    }

    return lines.join("\n");
  }

  async function handleCopyText() {
    await navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Controls — hidden when printing */}
      <div className="print:hidden px-4 sm:px-6 py-4 flex items-center justify-between border-b border-border">
        <Link
          href={`/setlists/${setlistId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy as Text"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-2xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none">
        {/* Header */}
        <h1 className="text-3xl font-bold print:text-2xl">{setlist.name}</h1>
        {(setlist.venue || setlist.gig_date) && (
          <p className="mt-1 text-muted-foreground print:text-gray-500">
            {setlist.venue}
            {setlist.venue && setlist.gig_date && " — "}
            {setlist.gig_date && formatGigDate(setlist.gig_date)}
          </p>
        )}

        {/* Notes */}
        {setlist.notes && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-sm print:bg-gray-100 print:border print:border-gray-300">
            <p className="whitespace-pre-wrap">{setlist.notes}</p>
          </div>
        )}

        {/* Song list */}
        <table className="w-full mt-6 text-sm">
          <thead>
            <tr className="border-b-2 border-foreground/20 print:border-gray-400">
              <th className="text-left py-2 w-8 font-semibold">#</th>
              <th className="text-left py-2 font-semibold">Song</th>
              <th className="text-left py-2 font-semibold w-16">Key</th>
              <th className="text-right py-2 font-semibold w-16">Time</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song, i) => {
              if (song.title === BREAK_SENTINEL) {
                return (
                  <tr key={song.id}>
                    <td
                      colSpan={4}
                      className="py-3 text-center text-xs uppercase tracking-wider text-muted-foreground font-medium print:text-gray-500"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border print:bg-gray-300" />
                        <span>
                          Set Break
                          {song.duration_ms && (
                            <span className="ml-1 font-mono">
                              ({formatDurationShort(song.duration_ms)})
                            </span>
                          )}
                        </span>
                        <div className="flex-1 h-px bg-border print:bg-gray-300" />
                      </div>
                    </td>
                  </tr>
                );
              }

              // Count actual songs (not breaks) for numbering
              const songNum =
                songs
                  .slice(0, i)
                  .filter((s) => s.title !== BREAK_SENTINEL).length + 1;

              return (
                <tr
                  key={song.id}
                  className="border-b border-border/50 print:border-gray-200"
                >
                  <td className="py-2 text-muted-foreground font-mono print:text-gray-500">
                    {songNum}
                  </td>
                  <td className="py-2">
                    <div className="font-medium">{song.title}</div>
                    {song.artist && (
                      <div className="text-xs text-muted-foreground print:text-gray-500">
                        {song.artist}
                      </div>
                    )}
                    {song.transitionNotes && (
                      <div className="text-xs italic text-muted-foreground mt-0.5 print:text-gray-400">
                        → {song.transitionNotes}
                      </div>
                    )}
                  </td>
                  <td className="py-2 font-mono text-muted-foreground print:text-gray-600">
                    {song.key ?? ""}
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground print:text-gray-600">
                    {song.duration_ms
                      ? formatDurationShort(song.duration_ms)
                      : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total duration */}
        {totalMs > 0 && (
          <div className="mt-4 text-right text-sm font-semibold">
            Total:{" "}
            <span className="font-mono">
              {Math.floor(totalMs / 60000)} min
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
