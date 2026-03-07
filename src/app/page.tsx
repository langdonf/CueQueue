import Link from "next/link";
import { Music, ListMusic, Radio, Share2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Music className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold">SetList</span>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-lg">
          Setlists that{" "}
          <span className="text-primary">actually work</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md">
          Build setlists, import from Spotify, drag to reorder, and share with
          your band. Go live on stage with a tap.
        </p>
        <Link
          href="/signup"
          className="mt-8 px-8 py-3 text-base font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          Get Started Free
        </Link>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl w-full">
          <div className="flex flex-col items-center gap-2">
            <ListMusic className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Build & Reorder</h3>
            <p className="text-sm text-muted-foreground">
              Drag songs into the perfect order. See total set time instantly.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Radio className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Live Mode</h3>
            <p className="text-sm text-muted-foreground">
              Full-screen gig view. Tap to advance. No distractions on stage.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Share2 className="w-8 h-8 text-primary" />
            <h3 className="font-semibold">Share with Band</h3>
            <p className="text-sm text-muted-foreground">
              Send a link. No account needed. Everyone sees the same setlist.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-muted-foreground border-t border-border">
        Built for musicians, by musicians.
      </footer>
    </div>
  );
}
