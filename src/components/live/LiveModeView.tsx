"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatDurationShort } from "@/lib/utils";

interface LiveSong {
  id: string;
  title: string;
  artist: string | null;
  duration_ms: number | null;
  bpm: number | null;
  key: string | null;
  notes: string | null;
}

interface LiveModeViewProps {
  setlistName: string;
  setlistId: string;
  songs: LiveSong[];
}

/** Opacity levels for upcoming songs (index 0 = next, 1 = after that, etc.) */
const UPCOMING_OPACITY = [0.7, 0.4, 0.2, 0.1];
const SWIPE_THRESHOLD = 50; // px minimum swipe distance

export function LiveModeView({
  setlistName,
  setlistId,
  songs,
}: LiveModeViewProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Swipe gesture tracking (refs to avoid re-renders)
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const currentSong = songs[currentIndex];
  const upcomingSongs = songs.slice(
    currentIndex + 1,
    currentIndex + 1 + UPCOMING_OPACITY.length
  );
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === songs.length - 1;

  const advance = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, songs.length - 1));
  }, [songs.length]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Wake Lock to prevent screen dimming
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }

    requestWakeLock();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
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
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === " "
      ) {
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

  // Swipe gesture handlers
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null || touchStartX.current === null) return;

    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    // Only trigger if vertical swipe is dominant (not a diagonal/horizontal gesture)
    if (
      Math.abs(deltaY) > SWIPE_THRESHOLD &&
      Math.abs(deltaY) > Math.abs(deltaX)
    ) {
      if (deltaY < 0) {
        // Swipe up → advance
        advance();
      } else {
        // Swipe down → go back
        goBack();
      }
    }

    touchStartY.current = null;
    touchStartX.current = null;
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
      className="fixed inset-0 bg-black text-white flex flex-col select-none z-50"
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* ═══ TOP THIRD: Current song (tap to go back) ═══ */}
        <button
          onClick={goBack}
          disabled={isFirst}
          className="flex-[1] flex flex-col items-center justify-center px-6 text-center min-h-0 cursor-default"
          aria-label="Previous song"
        >
          <div key={currentIndex} className="animate-slide-up">
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

            {/* Notes */}
            {currentSong.notes && (
              <p className="mt-4 text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                {currentSong.notes}
              </p>
            )}
          </div>
        </button>

        {/* ═══ BOTTOM TWO-THIRDS: Upcoming songs (tap to advance) ═══ */}
        <button
          onClick={advance}
          disabled={isLast}
          className="flex-[2] flex flex-col border-t border-white/10 min-h-0 cursor-default text-left"
          aria-label="Next song"
        >
          {/* "Up Next" label */}
          <div className="px-6 pt-4 pb-2 shrink-0">
            {upcomingSongs.length > 0 && (
              <span className="text-xs text-white/30 uppercase tracking-widest font-medium">
                Up Next
              </span>
            )}
          </div>

          {/* Upcoming song list */}
          <div className="flex-1 flex flex-col px-6 gap-1 overflow-hidden">
            {upcomingSongs.length > 0 ? (
              upcomingSongs.map((song, i) => (
                <div
                  key={`${currentIndex}-${song.id}`}
                  className="flex items-center gap-4 py-3 animate-slide-up"
                  style={{
                    opacity: UPCOMING_OPACITY[i],
                    animationDelay: `${(i + 1) * 50}ms`,
                    animationFillMode: "both",
                  }}
                >
                  {/* Position number */}
                  <span className="text-2xl sm:text-3xl font-bold font-mono w-10 text-right shrink-0">
                    {currentIndex + 2 + i}
                  </span>

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg sm:text-xl font-semibold truncate">
                      {song.title}
                    </div>
                    {song.artist && (
                      <div className="text-sm text-white/50 truncate">
                        {song.artist}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  {song.duration_ms && (
                    <span className="text-sm font-mono shrink-0">
                      {formatDurationShort(song.duration_ms)}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-lg text-white/30 uppercase tracking-wide">
                  End of setlist
                </span>
              </div>
            )}
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
