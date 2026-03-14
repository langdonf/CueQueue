"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      console.error("[callback] No code in URL");
      router.replace("/login?error=access_denied");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) {
          console.error("[callback] exchangeCodeForSession failed:", error.message, error);
          setStatus(`Error: ${error.message}`);
          setTimeout(() => router.replace("/login?error=otp_expired"), 2000);
        } else {
          console.log("[callback] Session established for:", data.user?.email);
          router.replace("/setlists");
        }
      });
  }, [router]);

  return (
    <div className="text-center">
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}
