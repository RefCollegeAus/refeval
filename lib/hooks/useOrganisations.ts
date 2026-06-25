"use client";

import { useState, useEffect } from "react";
import { getOrganisations } from "@/lib/services/organisations";
import { getMembersForOrganisation } from "@/lib/services/memberships";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { MemberRecord } from "@/lib/types/members";

// Phase 2 note: members are always scoped to the active organisation.
// super_admin sees members of their active organisation only — not all orgs.
// All-org member visibility is deferred to Phase 7 (RLS + service-role queries).
export function useOrganisations(activeOrgId: string | undefined) {
  const [organisations, setOrganisations] = useState<OrganisationRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);

  useEffect(() => {
    getOrganisations().then(setOrganisations);
  }, []);

  useEffect(() => {
    if (!activeOrgId) { setMembers([]); return; }
    getMembersForOrganisation(activeOrgId).then(setMembers);
  }, [activeOrgId]);

  const refereeMembers = members.filter(m => m.role === "referee");
  const adminMembers = members.filter(m => m.role === "admin");
  const educatorMembers = members.filter(m => m.role === "educator");
  const superAdminMembers = members.filter(m => m.role === "super_admin");
  const organisationName = (id: string) => organisations.find(o => o.id === id)?.name || "Unassigned";

  return {
    organisations, members,
    refereeMembers, adminMembers, educatorMembers, superAdminMembers,
    organisationName,
  };
}
