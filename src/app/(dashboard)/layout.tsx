import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccentTheme } from "@/lib/themes";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accentTheme: AccentTheme = "warm";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("accent_theme")
      .eq("id", user.id)
      .single();
    if (profile?.accent_theme) {
      accentTheme = profile.accent_theme as AccentTheme;
    }
  }

  return (
    <ThemeProvider initialTheme={accentTheme}>
      <div className="min-h-dvh flex flex-col pb-16 sm:pb-0">
        <Navbar />
        <main className="flex-1">{children}</main>
        <MobileNav />
      </div>
    </ThemeProvider>
  );
}
