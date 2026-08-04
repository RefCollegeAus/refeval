"use client";

import { Home, GraduationCap, Building2, LayoutDashboard, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import { cn } from "@/lib/utils/cn";

// Same destinations, same visibility rules, same click handlers as the
// pre-Phase-2 Header.tsx horizontal nav — this only changes presentation
// (a vertical, grouped, RefOps-style sidebar instead of a pill row) and adds
// aria-current, which the original never set. No route added, removed, or
// reorganised.
const LEARNING_SCREENS: Screen[] = [
  "learning-hub", "my-learning", "learning-progress", "playlists",
  "playlist-detail", "clip-library", "assignments", "assignment-detail",
  "groups",
];

const DASHBOARD_SCREENS: Screen[] = ["database", "team-management"];

interface SidebarNavItem {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  session: RefEvalSession | null;
  activeScreen?: Screen;
  onHome: () => void;
  onLearning?: () => void;
  onOrganisation?: () => void;
  onAdmin: () => void;
}

const SIDEBAR_WIDTH_PX = 232;

export function Sidebar({ open, onClose, session, activeScreen, onHome, onLearning, onOrganisation, onAdmin }: SidebarProps) {
  if (!session) return null;

  const isManagement = session.activeRole === "educator" || session.activeRole === "admin" || session.activeRole === "super_admin";
  const isAdmin = session.activeRole === "admin" || session.activeRole === "super_admin";

  const isActive = (screens: Screen[]) => (activeScreen ? screens.includes(activeScreen) : false);
  const homeScreens: Screen[] = ["educator", "referee", "viewer", "org-selector"];

  const items: SidebarNavItem[] = [
    { label: "Home", icon: Home, active: isActive(homeScreens), onClick: onHome },
    ...(isManagement && onLearning
      ? [{ label: "Learning", icon: GraduationCap, active: isActive(LEARNING_SCREENS), onClick: onLearning }]
      : []),
    ...(isAdmin && onOrganisation
      ? [{ label: "Organisation", icon: Building2, active: isActive(["organisation"]), onClick: onOrganisation }]
      : []),
    ...(isAdmin
      ? [{ label: "Dashboard", icon: LayoutDashboard, active: isActive(DASHBOARD_SCREENS), onClick: onAdmin }]
      : []),
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        aria-label="Primary"
        style={{ width: SIDEBAR_WIDTH_PX }}
        className={cn(
          // `rcds-sidebar` is a pure CSS styling hook (see the `.rcds-sidebar
          // ~ *` rule in app/globals.css) — not for a11y, that's aria-label
          // above. Deliberately `fixed` (never `sticky`) at every breakpoint,
          // including desktop: unlike RefOps's Sidebar — a flex-row sibling
          // of <main>, where `sticky` only needs to override vertical
          // scroll position — this component's screen content is a plain
          // DOM sibling, not a flex sibling, so a `sticky` element would
          // still occupy its own space in normal document flow and push
          // that content down below it instead of beside it. `fixed` is the
          // only position that removes it from flow entirely, which is what
          // the `.rcds-sidebar ~ *` horizontal offset rule assumes.
          "rcds-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-border bg-panel transition-transform",
          "lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0",
          // `max-lg:` / `lg:` are mutually exclusive media queries, so these
          // two rules can never both match the same viewport — deliberately
          // NOT an unconditional base rule overridden by a `lg:` one: with
          // Tailwind v4's native `translate` property (rather than composing
          // through `transform`), an unconditional `-translate-x-full` can
          // still win over a later `lg:translate-x-0` at desktop widths
          // depending on utility registration order, which is exactly the
          // bug this scoping avoids.
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-end px-3 sm:h-16 lg:hidden">
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-muted hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 lg:pt-4">
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Navigate
          </p>
          <div className="grid gap-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick();
                    onClose();
                  }}
                  aria-current={item.active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    item.active ? "bg-accent/15 text-amber-300" : "text-muted hover:bg-panel-3 hover:text-text"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}

export { SIDEBAR_WIDTH_PX };
