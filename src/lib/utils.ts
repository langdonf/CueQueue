import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date-only string (YYYY-MM-DD) for display, treating it as local time.
 *
 * `new Date("2026-04-20")` is parsed as UTC midnight, which shifts back a day
 * in US timezones. Appending `T00:00:00` forces local-time interpretation.
 */
export function formatGigDate(dateStr: string, pattern = "MMM d, yyyy"): string {
  return format(new Date(dateStr + "T00:00:00"), pattern);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export function formatDurationShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseDurationInputs(min: string, sec: string): number | null {
  const m = parseInt(min) || 0;
  const s = parseInt(sec) || 0;
  return m > 0 || s > 0 ? (m * 60 + s) * 1000 : null;
}

export function splitDurationMs(ms: number | null): { min: string; sec: string } {
  if (!ms) return { min: "", sec: "" };
  return {
    min: String(Math.floor(ms / 60000)),
    sec: String(Math.floor((ms % 60000) / 1000)),
  };
}
