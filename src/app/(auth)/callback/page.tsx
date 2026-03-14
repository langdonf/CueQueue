"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // The browser client automatically detects ?code= in the URL
    // and exchanges it for a session using the PKCE code verifier
    // it stored when signInWithOtp was called.
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/setlists");
      }
    });

    // If nothing happens after 5s, something went wrong
    const timeout = setTimeout(() => {
      router.replace("/login?error=otp_expired");
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="text-center">
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}
