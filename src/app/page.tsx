import Link from "next/link";
import { Music } from "lucide-react";

export default function HomePage() {
  return (
    <div
      className="splash-grain min-h-dvh flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #141210 0%, #09090b 60%)",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[#d4a574]" />
          <span className="text-lg font-medium text-[#e8e0d4]">SetList</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-[#8a8078] hover:text-[#e8e0d4] transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col px-6 sm:px-10 pt-24 sm:pt-32 max-w-2xl mx-auto w-full">
        <h1
          className="splash-fade-in text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[#e8e0d4] text-center sm:text-left"
          style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
        >
          Your next gig,{" "}
          <span className="text-[#d4a574]">sorted.</span>
        </h1>

        <p className="splash-fade-in-d1 mt-6 text-lg text-[#8a8078] max-w-md text-center sm:text-left">
          Build setlists. Share with your band.{" "}
          <br className="hidden sm:block" />
          Go live on stage.
        </p>

        <div className="splash-fade-in-d2 mt-10 flex justify-center sm:justify-start">
          <Link
            href="/signup"
            className="px-6 py-2.5 text-sm text-[#e8e0d4] border border-[#352f28] rounded-lg hover:bg-[#1a1816] transition-colors"
          >
            Start building
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="splash-fade-in-d3 mt-24 sm:mt-32 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 w-full">
          <div className="border-t border-[#252320] pt-4">
            <h3 className="text-sm font-medium text-[#e8e0d4]">
              Build & Reorder
            </h3>
            <p className="mt-1.5 text-sm text-[#8a8078] leading-relaxed">
              Drag songs into the perfect order. See total set time instantly.
            </p>
          </div>
          <div className="border-t border-[#252320] pt-4">
            <h3 className="text-sm font-medium text-[#e8e0d4]">Live Mode</h3>
            <p className="mt-1.5 text-sm text-[#8a8078] leading-relaxed">
              Full-screen gig view. Tap to advance. No distractions on stage.
            </p>
          </div>
          <div className="border-t border-[#252320] pt-4">
            <h3 className="text-sm font-medium text-[#e8e0d4]">
              Share with Band
            </h3>
            <p className="mt-1.5 text-sm text-[#8a8078] leading-relaxed">
              Send a link. No account needed. Everyone sees the same setlist.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-8">
        <div
          className="h-px mx-auto max-w-xs mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, #352f28, transparent)",
          }}
        />
        <p className="text-center text-xs text-[#5a554e] tracking-wide">
          Made for the stage.
        </p>
      </footer>
    </div>
  );
}
