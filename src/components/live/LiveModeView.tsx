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

const SWIPE_THRESHOLD = 50;

export function LiveModeView({
  setlistName,
  setlistId,
  songs,
}: LiveModeViewProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const currentSong = songs[currentIndex];
  const upcomingSongs = songs.slice(currentIndex + 1);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === songs.length - 1;

  const advance = useCallback(() => {
    if (currentIndex >= songs.length - 1) return;
    setDirection("up");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setIsTransitioning(false);
    }, 250);
  }, [currentIndex, songs.length]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;
    setDirection("down");
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setIsTransitioning(false);
    }, 250);
  }, [currentIndex]);

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

  /** Compute progressive styles for upcoming songs — smaller + more transparent as they recede */
  function getUpcomingStyle(index: number) {
    // Opacity: 0.7 → 0.5 → 0.35 → 0.2 → 0.12 → 0.08 ...
    const opacity = Math.max(0.06, 0.7 * Math.pow(0.65, index));
    // Font scale: 1 → 0.88 → 0.78 → 0.7 → 0.64 ...
    const scale = Math.max(0.55, 1 * Math.pow(0.9, index));
    return { opacity, scale };
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

      {/* Teleprompter content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* ═══ CURRENT SONG — tap to go back ═══ */}
        <button
          onClick={goBack}
          disabled={isFirst}
          className="shrink-0 flex flex-col items-center justify-center px-6 text-center cursor-default"
          style={{ minHeight: "35vh" }}
          aria-label="Previous song"
        >
          <div
            key={currentIndex}
            className={`live-current-enter ${
              isTransitioning
                ? direction === "up"
                  ? "live-exit-up"
                  : "live-exit-down"
                : ""
            }`}
          >
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
          </div>
        </button>

        {/* ═══ UPCOMING SONGS — tap to advance, fills remaining space ═══ */}
        <button
          onClick={advance}
          disabled={isLast}
          className="flex-1 flex flex-col border-t border-white/10 min-h-0 cursor-default text-left overflow-hidden"
          aria-label="Next song"
        >
          {upcomingSongs.length > 0 ? (
            <div
              key={currentIndex}
              className="flex-1 flex flex-col px-6 pt-4 overflow-hidden"
            >
              {upcomingSongs.map((song, i) => {
                const { opacity, scale } = getUpcomingStyle(i);
                return (
                  <div
                    key={song.id}
                    className="flex items-center gap-4 py-2.5 shrink-0 live-upcoming-enter"
                    style={{
                      opacity,
                      fontSize: `${scale}rem`,
                      animationDelay: `${i * 60}ms`,
                      transformOrigin: "left center",
                    }}
                  >
                    {/* Position number */}
                    <span
                      className="font-bold font-mono shrink-0 text-right"
                      style={{
                        width: "2.5rem",
                        fontSize: `${Math.max(1.2, 1.8 * scale)}rem`,
                      }}
                    >
                      {currentIndex + 2 + i}
                    </span>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold truncate"
                        style={{ fontSize: `${Math.max(0.85, 1.15 * scale)}rem` }}
                      >
                        {song.title}
                      </div>
                      {song.artist && (
                        <div
                          className="text-white/50 truncate"
                          style={{ fontSize: `${Math.max(0.7, 0.85 * scale)}rem` }}
                        >
                          {song.artist}
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    {song.duration_ms && (
                      <span
                        className="font-mono shrink-0"
                        style={{ fontSize: `${Math.max(0.7, 0.85 * scale)}rem` }}
                      >
                        {formatDurationShort(song.duration_ms)}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Fade-to-black gradient at the bottom */}
              <div className="mt-auto h-16 shrink-0 pointer-events-none bg-gradient-to-t from-black to-transparent" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-lg text-white/30 uppercase tracking-wide">
                End of setlist
              </span>
            </div>
          )}
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
