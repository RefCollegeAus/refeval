"use client";

import { useState, useEffect } from "react";
import { getOrganisations } from "@/lib/services/organisations";
import { getMembersForOrganisation } from "@/lib/services/memberships";
import type { OrganisationRecord } from "@/lib/types/organisations";
import type { MemberRecord } from "@/lib/types/members";

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

  function refreshOrganisations() {
    getOrganisations().then(setOrganisations);
  }

  const refereeMembers = members.filter(m => m.role === "referee");
  const adminMembers = members.filter(m => m.role === "admin");
  const educatorMembers = members.filter(m => m.role === "educator");
  const superAdminMembers = members.filter(m => m.role === "super_admin");
  const organisationName = (id: string) => organisations.find(o => o.id === id)?.name || "Unassigned";
  const activeOrg = organisations.find(o => o.id === activeOrgId) || null;

  return {
    organisations, members,
    refreshMembers, refreshOrganisations,
    refereeMembers, adminMembers, educatorMembers, superAdminMembers,
    organisationName, activeOrg,
  };
}
