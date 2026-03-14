"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "That magic link has expired. Request a new one below.",
  access_denied: "Access denied. Please try signing in again.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(ERROR_MESSAGES[error] || "Something went wrong. Please try again.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1
          className="text-2xl mb-2"
          style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
        >
          Check your email
        </h1>
        <p className="text-muted-foreground">
          We sent a magic link to <strong className="text-foreground">{email}</strong>.
          Click the link to sign in.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-sm text-primary hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="text-2xl text-center mb-2"
        style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
      >
        Welcome back
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Sign in with your email
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 border border-primary/40 text-foreground font-medium rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
