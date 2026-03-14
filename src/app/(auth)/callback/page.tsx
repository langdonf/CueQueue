"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Listen for the session to be established — this handles both
    // explicit exchangeCodeForSession AND the client's automatic
    // detectSessionInUrl fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.replace("/setlists");
      }
    });

    // Try explicit code exchange first
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          // Don't redirect to login yet — the client's detectSessionInUrl
          // may still pick up the session automatically
          console.warn("[callback] exchangeCodeForSession failed:", error.message);
        }
      });
    }

    // Safety net: if nothing works after 10s, send to login
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/setlists");
      } else {
        router.replace("/login?error=access_denied");
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="text-center">
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}
