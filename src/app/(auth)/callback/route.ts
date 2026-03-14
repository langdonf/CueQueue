import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 30 days in seconds
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    // We need to track cookies ourselves and attach them to the redirect
    // response. Using Next.js cookies() API + NextResponse.redirect() causes
    // cookies to be silently dropped because the redirect is a new response.
    const cookiesToReturn: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
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
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookiesToReturn.push({ name, value, options: { ...options, maxAge: COOKIE_MAX_AGE } });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}/setlists`);
      // Attach all session cookies to the redirect response
      cookiesToReturn.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });
      return response;
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=otp_expired`);
}
