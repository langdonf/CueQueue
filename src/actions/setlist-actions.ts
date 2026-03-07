"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_TIER_LIMITS } from "@/lib/constants";

interface CreateSetlistInput {
  name: string;
  venue: string | null;
  gig_date: string | null;
}

interface UpdateSetlistInput {
  name?: string;
  venue?: string | null;
  gig_date?: string | null;
  notes?: string | null;
}

export async function createSetlist(input: CreateSetlistInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check free tier limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier !== "pro") {
    const { count } = await supabase
      .from("setlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", false);

    if (count !== null && count >= FREE_TIER_LIMITS.maxSetlists) {
      return {
        error: `Free plan is limited to ${FREE_TIER_LIMITS.maxSetlists} setlists. Upgrade to Pro for unlimited.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("setlists")
    .insert({
      user_id: user.id,
      name: input.name,
      venue: input.venue,
      gig_date: input.gig_date,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/setlists");
  return { id: data.id };
}

export async function updateSetlist(id: string, input: UpdateSetlistInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("setlists")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/setlists/${id}`);
  revalidatePath("/setlists");
  return { success: true };
}

export async function deleteSetlist(id: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("setlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/setlists");
  return { success: true };
}

export async function getSetlist(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("setlists")
    .select(
      `
      *,
      setlist_songs(
        id,
        position,
        transition_notes,
        song:songs(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) return { error: error.message };

  // Sort songs by position
  if (data.setlist_songs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.setlist_songs.sort((a: any, b: any) => a.position - b.position);
  }

  return { data };
}
