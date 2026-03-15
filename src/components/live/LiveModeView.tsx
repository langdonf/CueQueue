"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";
import { BREAK_SENTINEL } from "@/lib/constants";
import { useRealtimeSetlist } from "@/hooks/useRealtimeSetlist";
import { updateSetlist } from "@/actions/setlist-actions";

import type { SongItem } from "@/lib/types";

interface LiveModeViewProps {
  setlistName: string;
  setlistId: string;
  songs: SongItem[];
  setlistNotes?: string | null;
}

const SWIPE_THRESHOLD = 50;

export function LiveModeView({
  setlistName,
  setlistId,
  songs: initialSongs,
  setlistNotes,
}: LiveModeViewProps) {
  const router = useRouter();
  const [songs, setSongs] = useState<SongItem[]>(initialSongs);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Real-time sync (read-only — no self-echo suppression needed)
  useRealtimeSetlist(setlistId, songs, setSongs);

  // Clamp currentIndex if songs are removed
  useEffect(() => {
    if (songs.length === 0) return;
    if (currentIndex >= songs.length) {
      setCurrentIndex(songs.length - 1);
    }
  }, [songs.length, currentIndex]);

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const [finished, setFinished] = useState(false);
  const [wrapUpNotes, setWrapUpNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const currentSong = songs[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === songs.length - 1;
  const isBreak = currentSong?.title === BREAK_SENTINEL;

  // Break countdown timer
  const [breakRemaining, setBreakRemaining] = useState<number | null>(null);
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current);
      breakTimerRef.current = null;
    }

    if (isBreak && currentSong?.duration_ms) {
      setBreakRemaining(currentSong.duration_ms);
      breakTimerRef.current = setInterval(() => {
        setBreakRemaining((prev) => {
          if (prev === null || prev <= 1000) {
            if (breakTimerRef.current) clearInterval(breakTimerRef.current);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else {
      setBreakRemaining(null);
    }

    return () => {
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    };
  }, [isBreak, currentIndex, currentSong?.duration_ms]);

  // All songs after the first — always rendered, played ones collapse via grid
  const allUpcoming = songs.slice(1);

  const advance = useCallback(() => {
    if (finished) return;
    if (currentIndex >= songs.length - 1) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, songs.length, finished]);

  const goBack = useCallback(() => {
    if (finished) {
      setFinished(false);
      return;
    }
    if (currentIndex <= 0) return;
    setCurrentIndex((i) => i - 1);
  }, [currentIndex, finished]);

  // Wake Lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    }
    requestWakeLock();
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") requestWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Escape") {
        router.push(`/setlists/${setlistId}`);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advance, goBack, router, setlistId]);

  // Swipe gestures
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY < 0) advance();
      else goBack();
    }
    touchStartY.current = null;
    touchStartX.current = null;
  }

  function getDepthStyle(index: number) {
    const scale = Math.max(0.7, 0.95 * Math.pow(0.95, index));
    const opacity = Math.max(0.3, 0.85 * Math.pow(0.85, index));
    const py = Math.max(6, 14 * scale);
    return { scale, opacity, py };
  }

  // Get the display number for a song (skipping breaks)
  function getSongNumber(index: number): number | null {
    if (songs[index].title === BREAK_SENTINEL) return null;
    return songs.slice(0, index).filter((s) => s.title !== BREAK_SENTINEL).length + 1;
  }

  async function handleSaveWrapUpNotes() {
    if (!wrapUpNotes.trim()) {
      router.push(`/setlists/${setlistId}`);
      return;
    }
    setSavingNotes(true);
    // Append to existing notes rather than overwriting
    const newNotes = setlistNotes
      ? `${setlistNotes}\n\n--- Gig Notes ---\n${wrapUpNotes.trim()}`
      : wrapUpNotes.trim();
    await updateSetlist(setlistId, { notes: newNotes });
    setNotesSaved(true);
    setSavingNotes(false);
    setTimeout(() => {
      router.push(`/setlists/${setlistId}`);
    }, 1000);
  }

  if (finished) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col z-50">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button
            onClick={goBack}
            className="p-2 text-white/60 hover:text-white transition-colors"
            aria-label="Back to last song"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-white/40 font-medium">
            {setlistName}
          </span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Great show!
          </h1>
          <p className="text-white/50 mb-8">
            How did it go? Jot down any notes while it&apos;s fresh.
          </p>

          <textarea
            value={wrapUpNotes}
            onChange={(e) => setWrapUpNotes(e.target.value)}
            placeholder="e.g. Crowd loved the opener, skip song 4 next time, need to rehearse the bridge on Free Bird..."
            rows={5}
            className="w-full max-w-md px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            autoFocus
          />

          <div className="flex gap-3 mt-6 w-full max-w-md">
            <button
              onClick={() => router.push(`/setlists/${setlistId}`)}
              className="flex-1 py-3 text-sm text-white/50 hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSaveWrapUpNotes}
              disabled={savingNotes || notesSaved}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {notesSaved ? (
                "Saved!"
              ) : savingNotes ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Notes"
              )}
            </button>
          </div>
        </div>

        {/* Progress bar — full */}
        <div className="h-1 bg-white/5 shrink-0">
          <div className="h-full bg-primary w-full" />
        </div>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <p>No songs in this setlist.</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col select-none z-50 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/setlists/${setlistId}`);
          }}
          className="p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Exit Live Mode"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-sm text-white/40 font-medium truncate mx-4">
          {setlistName}
        </span>
        <span className="text-sm text-white/40 font-mono shrink-0">
          {currentIndex + 1}/{songs.length}
        </span>
      </div>

      {/* Pinned setlist notes */}
      {setlistNotes && currentIndex === 0 && (
        <div className="mx-4 mb-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-white/50 leading-relaxed max-h-16 overflow-y-auto">
          {setlistNotes}
        </div>
      )}

      {/* Teleprompter content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ═══ CURRENT SONG / BREAK — tap to go back ═══ */}
        <button
          onClick={goBack}
          disabled={isFirst}
          className="shrink-0 flex flex-col items-center justify-center px-6 text-center cursor-default"
          style={{ minHeight: "35vh" }}
          aria-label="Previous song"
        >
          {isBreak ? (
            /* Break card */
            <div>
              <div className="flex items-center gap-4 justify-center mb-4">
                <div className="w-16 h-px bg-white/20" />
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white/70">
                  Set Break
                </h1>
                <div className="w-16 h-px bg-white/20" />
              </div>
              {breakRemaining !== null ? (
                <p className={`text-4xl font-mono ${breakRemaining === 0 ? "text-primary animate-pulse" : "text-white/70"}`}>
                  {formatDurationShort(breakRemaining)}
                </p>
              ) : currentSong.duration_ms ? (
                <p className="text-xl font-mono text-white/50">
                  {formatDurationShort(currentSong.duration_ms)}
                </p>
              ) : null}
            </div>
          ) : (
            /* Song card */
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
                {currentSong.title}
              </h1>
              {currentSong.artist && (
                <p className="mt-2 text-lg sm:text-xl text-white/60">
                  {currentSong.artist}
                </p>
              )}

              {/* Metadata badges */}
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                {currentSong.key && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-mono">
                    {currentSong.key}
                  </span>
                )}
                {currentSong.bpm && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-mono">
                    {currentSong.bpm} BPM
                  </span>
                )}
                {currentSong.duration_ms && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-mono">
                    {formatDurationShort(currentSong.duration_ms)}
                  </span>
                )}
              </div>

              {currentSong.notes && (
                <p className="mt-4 text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                  {currentSong.notes}
                </p>
              )}

              {/* Transition notes for current song */}
              {currentSong.transitionNotes && (
                <p className="mt-3 text-sm text-white/30 italic">
                  → {currentSong.transitionNotes}
                </p>
              )}
            </div>
          )}
        </button>

        {/* ═══ UPCOMING SONGS — tap to advance ═══ */}
        <button
          onClick={advance}
          className="flex-1 flex flex-col border-t border-white/10 min-h-0 cursor-default text-left overflow-hidden"
          aria-label="Next song"
        >
          <div className="flex-1 overflow-hidden relative">
            {allUpcoming.length > 0 ? (
              <div
                className="pt-4"
                style={{
                  display: "grid",
                  gridTemplateRows: allUpcoming
                    .map((_, i) => {
                      const songIndex = i + 1;
                      return songIndex <= currentIndex ? "0fr" : "1fr";
                    })
                    .join(" "),
                  transition: "grid-template-rows 0.35s ease-out",
                }}
              >
                {allUpcoming.map((song, i) => {
                  const songIndex = i + 1;
                  const isPlayed = songIndex <= currentIndex;
                  const depthPosition = songIndex - currentIndex - 1;
                  const { scale, opacity, py } = isPlayed
                    ? { scale: 1, opacity: 0, py: 0 }
                    : getDepthStyle(depthPosition);

                  const isSongBreak = song.title === BREAK_SENTINEL;
                  const num = getSongNumber(songIndex);

                  return (
                    <div
                      key={song.id}
                      className="overflow-hidden"
                      style={{ minHeight: 0 }}
                    >
                      <div
                        className="flex items-center gap-3 w-full px-6"
                        style={{
                          opacity,
                          transform: `scale(${scale})`,
                          transformOrigin: "center center",
                          paddingTop: `${py}px`,
                          paddingBottom: `${py}px`,
                          transition: "all 0.35s ease-out",
                        }}
                      >
                        {isSongBreak ? (
                          /* Break in upcoming list */
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-px bg-white/40" />
                            <span className="text-base uppercase tracking-wider text-white/80 font-semibold">
                              Break
                            </span>
                            <div className="flex-1 h-px bg-white/40" />
                          </div>
                        ) : (
                          /* Song in upcoming list */
                          <>
                            <span className="text-2xl font-bold font-mono shrink-0">
                              {num}
                            </span>

                            <div className="flex-1 min-w-0">
                              <div className="text-lg font-semibold truncate">
                                {song.title}
                              </div>
                              {song.artist && (
                                <div className="text-sm text-white/50 truncate">
                                  {song.artist}
                                </div>
                              )}
                            </div>

                            <span className="text-sm font-mono shrink-0">
                              {song.duration_ms ? formatDurationShort(song.duration_ms) : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                <span className="text-lg text-white/30 uppercase tracking-wide">
                  End of setlist
                </span>
              </div>
            )}

            {/* Fade-to-black gradient at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-black to-transparent" />
          </div>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5 shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / songs.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
