import { getSupabaseClient } from "@/lib/supabase/client";

export async function getReviewsWithClips() {
  const { data, error } = await getSupabaseClient()
    .from("reviews")
    .select("*, clips(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load reviews:", error.message);
    return [];
  }

  return data || [];
}