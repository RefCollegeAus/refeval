import { supabase } from "@/lib/supabase/client";
import type { OrganisationRecord } from "@/lib/types/organisations";

export async function getOrganisations(): Promise<OrganisationRecord[]> {
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, status, created_at")
    .order("name");

  if (error) {
    console.error("Failed to load organisations:", error.message);
    return [];
  }

  return (data || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    status: (org.status as "Active" | "Suspended") || "Active",
    createdAt: org.created_at || new Date().toISOString(),
  }));
}
