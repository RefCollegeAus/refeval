import { supabase } from "@/lib/supabase/client";
import type { MemberRecord } from "@/lib/types/members";
import type { Role } from "@/lib/types/auth";

export async function getMembersForOrganisation(organisationId: string): Promise<MemberRecord[]> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select("role, organisation_id, user_id, profiles(id, name, email)")
    .eq("organisation_id", organisationId);

  if (error) {
    console.error("Failed to load members:", error.message);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.user_id,
    name: (m.profiles as any)?.name || (m.profiles as any)?.email || "Unknown",
    email: (m.profiles as any)?.email || "",
    role: m.role as Role,
    organisationId: m.organisation_id,
  }));
}
