import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 30 days in seconds — keeps users logged in for a month
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge: COOKIE_MAX_AGE })
            );
          } catch {
            // setAll can be called from Server Components where cookies
            // can't be set — this is fine for read-only operations
          }
        },
      },
    }
  );
}
