"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const MIN_MS = 300_000;  // 5 min
const MAX_MS = 1_800_000; // 30 min
const STEP_MS = 60_000;   // 1 min

interface BreakDurationSliderProps {
  durationMs: number;
  onChange: (durationMs: number) => void;
}

export function BreakDurationSlider({ durationMs, onChange }: BreakDurationSliderProps) {
  const [localMs, setLocalMs] = useState(durationMs);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Sync if parent changes (e.g. real-time update from another user)
  useEffect(() => {
    setLocalMs(durationMs);
  }, [durationMs]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setLocalMs(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(val);
      }, 300);
    },
    [onChange]
  );

  const minutes = Math.round(localMs / 60_000);

  return (
    <div className="flex items-center gap-3 w-full">
      <input
        type="range"
        min={MIN_MS}
        max={MAX_MS}
        step={STEP_MS}
        value={localMs}
        onChange={handleChange}
        className="break-slider flex-1 h-6 cursor-pointer"
        aria-label="Break duration"
      />
      <span className="text-sm text-muted-foreground font-mono shrink-0">
        {minutes} min
      </span>
    </div>
  );
}
