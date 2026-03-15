import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/types";

export async function withAuth<T>(
  fn: (supabase: SupabaseClient, user: User) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  return fn(supabase, user);
}
