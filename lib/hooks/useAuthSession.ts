"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RefEvalSession, Role, Screen } from "@/lib/types/auth";

export function useAuthSession(setScreen: (s: Screen) => void) {
  const [session, setSession] = useState<RefEvalSession | null>(null);
  const [pendingSession, setPendingSession] = useState<RefEvalSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    async function restoreSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthChecked(true); return; }

      const { data: profileData } = await supabase
        .from("profiles").select("id, email, name").eq("id", user.id).single();

      const { data: membershipRows } = await supabase
        .from("organisation_members")
        .select("role, organisation_id, organisations(name)")
        .eq("user_id", user.id);

      if (!membershipRows || membershipRows.length === 0) {
        await supabase.auth.signOut();
        setAuthChecked(true);
        return;
      }

      const memberships = membershipRows.map((m: any) => ({
        organisationId: m.organisation_id,
        organisationName: (m.organisations as any)?.name || "Unknown Organisation",
        role: m.role as Role,
      }));
      const profile = {
        id: profileData?.id || user.id,
        email: profileData?.email || user.email || "",
        name: profileData?.name || user.email || "User",
      };

      if (memberships.length === 1) {
        const m = memberships[0];
        setSession({
          user: { id: user.id, email: user.email || "" },
          profile, memberships,
          activeOrganisation: { id: m.organisationId, name: m.organisationName },
          activeRole: m.role,
        });
        setScreen(m.role === "referee" ? "referee" : "educator");
      } else {
        setPendingSession({
          user: { id: user.id, email: user.email || "" },
          profile, memberships,
          activeOrganisation: null, activeRole: null,
        });
        setScreen("org-selector");
      }
      setAuthChecked(true);
    }
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function login() {
    const email = loginName.trim();
    if (!email) { setLoginError("Please enter your email."); return; }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email, password: loginPassword,
    });
    if (authError || !authData.user) { setLoginError(authError?.message || "Login failed."); return; }

    const { data: profileData } = await supabase
      .from("profiles").select("id, email, name").eq("id", authData.user.id).single();

    const { data: membershipRows, error: membershipError } = await supabase
      .from("organisation_members")
      .select("role, organisation_id, organisations(name)")
      .eq("user_id", authData.user.id);

    if (membershipError) { await supabase.auth.signOut(); setLoginError(membershipError.message); return; }
    if (!membershipRows || membershipRows.length === 0) {
      await supabase.auth.signOut();
      setLoginError("Your account is not assigned to any organisation yet.");
      return;
    }

    const memberships = membershipRows.map((m: any) => ({
      organisationId: m.organisation_id,
      organisationName: (m.organisations as any)?.name || "Unknown Organisation",
      role: m.role as Role,
    }));
    const profile = {
      id: profileData?.id || authData.user.id,
      email: profileData?.email || authData.user.email || "",
      name: profileData?.name || authData.user.email || "User",
    };

    setLoginError("");
    setLoginPassword("");

    if (memberships.length === 1) {
      const m = memberships[0];
      setSession({
        user: { id: authData.user.id, email: authData.user.email || "" },
        profile, memberships,
        activeOrganisation: { id: m.organisationId, name: m.organisationName },
        activeRole: m.role,
      });
      setScreen(m.role === "referee" ? "referee" : "educator");
    } else {
      setPendingSession({
        user: { id: authData.user.id, email: authData.user.email || "" },
        profile, memberships,
        activeOrganisation: null, activeRole: null,
      });
      setScreen("org-selector");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setPendingSession(null);
    setScreen("login");
  }

  function selectOrganisation(membership: RefEvalSession["memberships"][number]) {
    if (!pendingSession) return;
    const s: RefEvalSession = {
      ...pendingSession,
      activeOrganisation: { id: membership.organisationId, name: membership.organisationName },
      activeRole: membership.role,
    };
    setSession(s);
    setPendingSession(null);
    setScreen(membership.role === "referee" ? "referee" : "educator");
  }

  return {
    session, pendingSession, authChecked,
    loginName, setLoginName,
    loginPassword, setLoginPassword,
    loginError,
    login, logout, selectOrganisation,
  };
}
