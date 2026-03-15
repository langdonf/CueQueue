import { createBrowserClient } from "@supabase/ssr";

// 30 days — matches the middleware cookie settings
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
      },
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax" as const,
        secure: true,
      },
    }
  );
}
