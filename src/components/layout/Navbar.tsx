"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Music, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/dev/ThemeSwitcher";

export function Navbar() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border">
      <Link href="/setlists" className="flex items-center gap-2">
        <Music className="w-5 h-5 text-primary" />
        <span className="text-lg font-bold">SetList</span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <button
          onClick={handleSignOut}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
