import { getSupabaseClient } from "@/lib/supabase/client";
import type { OrganisationRecord } from "@/lib/types/organisations";

export async function getOrganisations(): Promise<OrganisationRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from("organisations")
    .select("id, name, status, created_at, timezone, brand_colour, logo_url")
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
    timezone: org.timezone || "Australia/Melbourne",
    brandColour: org.brand_colour || "#a56a1b",
    logoUrl: org.logo_url || null,
  }));
}

export async function updateOrganisation(params: {
  organisationId: string;
  name?: string;
  timezone?: string;
  brandColour?: string;
  logoUrl?: string | null;
}): Promise<{ success: true } | { error: string }> {
  const res = await fetch("/api/admin/org-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) return { error: (json as any).error ?? "Unknown error." };
  return { success: true };
}
