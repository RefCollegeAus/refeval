// Shared role → colour-token mapping, extracted from OrganisationScreen.tsx's
// Phase 3 RolePill so every screen that displays a member's role (Members list,
// Team Management, user profile, ManageUserModal) uses the same identity colours
// instead of each re-deciding its own. Roles are a genuine, meaningful
// distinction (referee/educator/admin ARE different account types) — this is
// categorical identity colour, not a status badge, so it lives outside the
// success/warning/danger/info Badge tone set.
export const ROLE_TONE: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  referee:     { dot: "bg-good",   text: "text-good",         bg: "bg-good/10",   border: "border-good/25" },
  educator:    { dot: "bg-info",   text: "text-blue-300",     bg: "bg-info/10",   border: "border-info/25" },
  admin:       { dot: "bg-accent", text: "text-amber-300",    bg: "bg-accent/10", border: "border-accent/25" },
  super_admin: { dot: "bg-accent", text: "text-amber-300",    bg: "bg-accent/10", border: "border-accent/25" },
  viewer:      { dot: "bg-muted",  text: "text-muted",        bg: "bg-panel-3",   border: "border-border" },
};
