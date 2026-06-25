"use client";

import { useState, useEffect } from "react";
import { getOrganisations } from "@/lib/services/organisations";
import { getMembersForOrganisation } from "@/lib/services/memberships";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { MemberRecord } from "@/lib/types/members";

// Members are scoped to the active organisation via getMembersForOrganisation.
// RLS (Phase 7) enforces this at the database layer for all roles.
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

  function refreshMembers() {
    if (!activeOrgId) return;
    getMembersForOrganisation(activeOrgId).then(setMembers);
  }

  const refereeMembers = members.filter(m => m.role === "referee");
  const adminMembers = members.filter(m => m.role === "admin");
  const educatorMembers = members.filter(m => m.role === "educator");
  const superAdminMembers = members.filter(m => m.role === "super_admin");
  const organisationName = (id: string) => organisations.find(o => o.id === id)?.name || "Unassigned";

  return {
    organisations, members, refreshMembers,
    refereeMembers, adminMembers, educatorMembers, superAdminMembers,
    organisationName,
  };
}
