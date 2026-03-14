import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 30 days in seconds — keeps users logged in for a month
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Callback handles its own auth — skip middleware entirely so
  // getUser() doesn't interfere with the PKCE code verifier cookie
  if (pathname.startsWith("/callback")) {
    return NextResponse.next({ request });
  }

  // If any route has a ?code= param (magic link landed on wrong path),
  // redirect to /callback so the code gets exchanged for a session
  const code = searchParams.get("code");
  if (code) {
    const url = request.nextUrl.clone();
    url.pathname = "/callback";
    return NextResponse.redirect(url);
  }

  // If Supabase redirected with an auth error (expired/invalid magic link),
  // send the user to /login with a friendly error message
  const authError = searchParams.get("error_code");
  if (authError && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Pass only the error_code so the login page can show a message
    url.search = `?error=${authError}`;
    url.hash = "";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, maxAge: COOKIE_MAX_AGE } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();


  // Allow public routes
  if (
    pathname === "/" ||
    pathname.startsWith("/shared/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/callback")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/setlists";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
