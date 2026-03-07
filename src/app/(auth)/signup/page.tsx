"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
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
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a magic link to <strong className="text-foreground">{email}</strong>.
          Click the link to create your account.
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
      <h1 className="text-2xl font-bold text-center mb-2">Create your account</h1>
      <p className="text-center text-muted-foreground mb-8">
        Start building setlists in seconds
      </p>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Get Started Free"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Free plan includes 3 setlists. No credit card required.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
