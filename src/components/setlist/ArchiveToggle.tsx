"use client";

import Link from "next/link";

interface ArchiveToggleProps {
  showArchived: boolean;
}

export function ArchiveToggle({ showArchived }: ArchiveToggleProps) {
  return (
    <div className="flex items-center gap-1 mb-4 text-sm">
      <Link
        href="/setlists"
        className={`px-3 py-1.5 rounded-lg transition-colors ${
          !showArchived
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        Active
      </Link>
      <Link
        href="/setlists?show=archived"
        className={`px-3 py-1.5 rounded-lg transition-colors ${
          showArchived
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        Archived
      </Link>
    </div>
  );
}
