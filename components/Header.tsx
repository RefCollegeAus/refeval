"use client";

import { useState } from "react";
import { Bell, Menu, ChevronDown } from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { OrgPage } from "@/components/organisation/OrganisationScreen";
import type { NavContext } from "./shell/nav";
import { BrandBlock } from "./shell/BrandBlock";
import { Sidebar } from "./shell/Sidebar";
import { UserMenu } from "./shell/UserMenu";
import { initialsFor } from "@/lib/utils/initials";

// Referee College Design System — Phase 2 (shell alignment).
//
// Same exported name, same import path, same prop signature as before this
// phase — every one of the ~25 call sites in app/page.tsx renders this
// exactly as it did previously, with the exact same handlers. Nothing about
// routing, permissions, session shape, or business logic changed; only what
// this component renders internally did:
//   - a slim sticky top bar (brand + org/notifications/account/search on the
//     right) instead of the old flat single-row nav-pill layout, and
//   - a persistent Sidebar (new, see ./shell/Sidebar.tsx) that now owns the
//     primary navigation this component used to render inline as pills.
// The sidebar is `position: fixed` (see Sidebar.tsx) rather than a normal
// flex sibling, because every screen's own content renders as a JSX SIBLING
// of this component (not a `children` slot it wraps) — there is no single
// layout wrapper in this codebase to put a flex row around. Instead,
// app/globals.css has a `.rcds-sidebar ~ *` rule (general sibling
// combinator) that pushes whatever DOM sibling comes after the sidebar
// clear of it on desktop — since Sidebar's `<aside>` and each screen's own
// content div are always adjacent DOM siblings (React fragments don't
// introduce a wrapping node), this works for every screen without touching
// any of the ~25 call sites individually.
export function Header({
  session,
  onHome,
  onAdmin,
  onLearning,
  onOrganisation,
  onNotifications,
  onProfile,
  onLogout,
  unreadNotificationCount = 0,
  activeScreen,
  navContext,
  onNavigate,
  orgLogoUrl,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onAdmin: () => void;
  onLearning?: () => void;
  onOrganisation?: () => void;
  onNotifications?: () => void;
  onProfile: () => void;
  onLogout: () => void;
  unreadNotificationCount?: number;
  activeScreen?: Screen;
  navContext?: NavContext;
  onNavigate?: (screen: Screen, orgPage?: OrgPage) => void;
  orgLogoUrl?: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userInitials = session ? initialsFor(session.profile.name, session.profile.email) : "";
  const orgName = session?.activeOrganisation?.name ?? null;
  const orgInitials = orgName ? initialsFor(orgName, null) : "";

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-panel/85 px-4 backdrop-blur-md sm:h-[104px] sm:gap-5 sm:px-6">

        {session && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 inline-flex items-center justify-center rounded-lg border-0 bg-transparent p-1.5 text-muted shadow-none transition-colors hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}

        <BrandBlock />

        <div className="flex-1" />

        {session && (
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {orgName && (
              <button
                onClick={onProfile}
                title={orgName}
                aria-label={`Organisation: ${orgName}`}
                className="hidden items-center gap-2 rounded-lg border border-border bg-panel-3/70 py-1.5 pl-1.5 pr-3 text-sm font-semibold text-text shadow-none transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
              >
                {orgLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- org-uploaded logo of arbitrary origin
                  <img src={orgLogoUrl} alt="" className="h-6 w-6 shrink-0 rounded-md object-contain" />
                ) : (
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel-2 text-[10px] font-bold text-muted"
                    aria-hidden="true"
                  >
                    {orgInitials}
                  </span>
                )}
                <span className="max-w-[12rem] truncate lg:max-w-[16rem]">{orgName}</span>
                <ChevronDown size={14} className="shrink-0 text-muted" />
              </button>
            )}

            {onNotifications && (
              <button
                onClick={onNotifications}
                aria-label={
                  unreadNotificationCount > 0
                    ? `Notifications, ${unreadNotificationCount} unread`
                    : "Notifications"
                }
                title="Notifications"
                aria-current={activeScreen === "notifications" ? "page" : undefined}
                className="relative inline-flex items-center justify-center rounded-lg border-0 bg-transparent p-2 text-muted shadow-none transition-colors hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white"
                  >
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            <UserMenu
              userInitials={userInitials}
              userName={session.profile.name}
              onProfile={onProfile}
              onLogout={onLogout}
              isProfileActive={activeScreen === "user-profile"}
            />
          </div>
        )}
      </header>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        session={session}
        activeScreen={activeScreen}
        navContext={navContext}
        onNavigate={onNavigate}
        onHome={onHome}
        onLearning={onLearning}
        onOrganisation={onOrganisation}
        onAdmin={onAdmin}
      />
    </>
  );
}
