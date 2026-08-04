"use client";

import { useState } from "react";
import { LogOut, Bell, Search, Menu } from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import { BrandBlock } from "./shell/BrandBlock";
import { Sidebar } from "./shell/Sidebar";

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
  onSearch,
  onProfile,
  onLogout,
  unreadNotificationCount = 0,
  activeScreen,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onAdmin: () => void;
  onLearning?: () => void;
  onOrganisation?: () => void;
  onNotifications?: () => void;
  onSearch?: () => void;
  onProfile: () => void;
  onLogout: () => void;
  unreadNotificationCount?: number;
  activeScreen?: Screen;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userInitials = session
    ? session.profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || session.profile.email[0]?.toUpperCase() || "?"
    : "";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel/90 px-4 backdrop-blur-md sm:h-16 sm:gap-4 sm:px-6">

        {session && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}

        <BrandBlock />

        <div className="flex-1" />

        {session && (
          <div className="flex items-center gap-1 sm:gap-1.5">
            {onSearch && (
              <button
                onClick={onSearch}
                aria-label="Search"
                title="Search"
                className="rounded-lg p-2 text-muted transition-colors hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Search size={17} />
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
                className="relative rounded-lg p-2 text-muted transition-colors hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Bell size={17} />
                {unreadNotificationCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
                  >
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onProfile}
              aria-label={`Profile: ${session.profile.name}`}
              title={session.profile.name}
              aria-current={activeScreen === "user-profile" ? "page" : undefined}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/20 text-xs font-bold text-amber-300 ring-1 ring-inset ring-accent/30 transition-colors hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {userInitials}
            </button>

            <button
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <LogOut size={17} />
            </button>
          </div>
        )}
      </header>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        session={session}
        activeScreen={activeScreen}
        onHome={onHome}
        onLearning={onLearning}
        onOrganisation={onOrganisation}
        onAdmin={onAdmin}
      />
    </>
  );
}
