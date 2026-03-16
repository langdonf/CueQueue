"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface InlineSongNotesProps {
  songId: string;
  initialNotes: string;
  onSave: (songId: string, notes: string | null) => void;
  readOnly?: boolean;
}

export function InlineSongNotes({ songId, initialNotes, onSave, readOnly }: InlineSongNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync if parent updates the song (e.g. from real-time sync)
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Auto-resize textarea to fit content
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [notes, resize]);

  function handleChange(value: string) {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSave(songId, value || null);
    }, 500);
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (readOnly) {
    if (!notes) return null;
    return (
      <div className="px-4 pb-1 text-xs text-muted-foreground whitespace-pre-wrap">
        {notes}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      value={notes}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Add notes..."
      rows={1}
      className="w-full px-4 py-1 pt-2 text-xs text-muted-foreground bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-muted-foreground/50 focus:text-foreground"
    />
  );
}
