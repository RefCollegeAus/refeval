"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";
import type { OrgPage } from "@/components/organisation/OrganisationScreen";
import { resolveVisibleNavGroups, type NavContext, type NavItem } from "./nav";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  session: RefEvalSession | null;
  activeScreen?: Screen;
  activeOrgPage?: OrgPage;
  navContext?: NavContext;
  onNavigate?: (screen: Screen, orgPage?: OrgPage) => void;
  // Legacy fallback, used only when navContext/onNavigate are not supplied.
  onHome: () => void;
  onLearning?: () => void;
  onOrganisation?: () => void;
  onAdmin: () => void;
}

const SIDEBAR_WIDTH_PX = 256;

function isItemActive(item: NavItem, activeScreen: Screen | undefined, activeOrgPage: OrgPage | undefined): boolean {
  if (!activeScreen) return false;
  const screens = item.activeScreens ?? [item.screen];
  if (!screens.includes(activeScreen)) return false;
  if (item.orgPage && activeScreen === "organisation") return item.orgPage === activeOrgPage;
  return true;
}

function hasActiveChild(item: NavItem, activeScreen: Screen | undefined, activeOrgPage: OrgPage | undefined): boolean {
  return (item.children ?? []).some((child) => isItemActive(child, activeScreen, activeOrgPage));
}

export function Sidebar({
  open, onClose, session, activeScreen, activeOrgPage, navContext, onNavigate,
  onHome, onLearning, onOrganisation, onAdmin,
}: SidebarProps) {
  const groups = navContext ? resolveVisibleNavGroups(navContext) : null;
  const initialExpanded = new Set(
    (groups ?? [])
      .flatMap((g) => g.items)
      .filter((item) => item.children && (isItemActive(item, activeScreen, activeOrgPage) || hasActiveChild(item, activeScreen, activeOrgPage)))
      .map((item) => item.label)
  );
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  useEffect(() => {
    if (!groups) return;
    const active = groups
      .flatMap((g) => g.items)
      .filter((item) => item.children && (isItemActive(item, activeScreen, activeOrgPage) || hasActiveChild(item, activeScreen, activeOrgPage)))
      .map((item) => item.label);
    if (active.length === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      active.forEach((label) => next.add(label));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, activeOrgPage]);

  if (!session) return null;

  const isManagement = session.activeRole === "educator" || session.activeRole === "admin" || session.activeRole === "super_admin";
  const isAdmin = session.activeRole === "admin" || session.activeRole === "super_admin";

  const navigate = (item: NavItem) => {
    const screen = item.resolveScreen && navContext ? item.resolveScreen(navContext) : item.screen;
    if (onNavigate) {
      onNavigate(screen, item.orgPage);
    } else if (screen === "organisation" && onOrganisation) {
      onOrganisation();
    } else if (screen === "learning-hub" && onLearning) {
      onLearning();
    } else if (screen === "database") {
      onAdmin();
    } else {
      onHome();
    }
    onClose();
  };

  const toggleExpanded = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const legacyItems = !groups
    ? [
        { label: "Home", active: activeScreen ? ["educator", "referee", "viewer", "org-selector"].includes(activeScreen) : false, onClick: onHome },
        ...(isManagement && onLearning
          ? [{ label: "Learning", active: activeScreen === "learning-hub", onClick: onLearning }]
          : []),
        ...(isAdmin && onOrganisation
          ? [{ label: "Organisation", active: activeScreen === "organisation", onClick: onOrganisation }]
          : []),
        ...(isAdmin ? [{ label: "Dashboard", active: activeScreen === "database", onClick: onAdmin }] : []),
      ]
    : null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        aria-label="Primary"
        style={{ width: SIDEBAR_WIDTH_PX }}
        className={cn(
          "rcds-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-border bg-panel transition-transform",
          "lg:top-[104px] lg:z-0 lg:h-[calc(100vh-104px)] lg:translate-x-0",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-end px-3 lg:hidden">
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg border-0 bg-transparent p-1.5 text-muted shadow-none hover:bg-panel-3 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pb-4 lg:pt-4">
          {legacyItems ? (
            <>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Navigate</p>
              <div className="grid gap-0.5">
                {legacyItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { item.onClick(); onClose(); }}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border-0 px-2.5 py-2 text-left text-sm font-medium shadow-none transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      item.active ? "bg-accent/15 text-amber-300" : "bg-transparent text-muted hover:bg-panel-3 hover:text-text"
                    )}
                  >
                    <span className="flex-1">{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {groups!.map((group) => (
                <div key={group.label} className="mb-5">
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {group.label}
                  </p>
                  <div className="grid gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item, activeScreen, activeOrgPage);
                      const childActive = hasActiveChild(item, activeScreen, activeOrgPage);
                      const isExpanded = expanded.has(item.label);

                      if (item.children && item.children.length > 0) {
                        return (
                          <div key={item.label}>
                            <div
                              className={cn(
                                "flex items-center gap-1 rounded-lg border-0 pr-1 text-sm font-medium shadow-none transition-colors",
                                active || childActive ? "bg-accent/15 text-amber-300" : "bg-transparent text-muted hover:bg-panel-3 hover:text-text"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => navigate(item)}
                                aria-current={active ? "page" : undefined}
                                className="flex flex-1 items-center gap-2.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-left shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                              >
                                <Icon size={16} className="shrink-0" />
                                <span className="flex-1">{item.label}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleExpanded(item.label)}
                                aria-expanded={isExpanded}
                                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label} section`}
                                className="rounded-lg border-0 bg-transparent p-1.5 shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                              >
                                <ChevronDown size={14} className={cn("transition-transform", isExpanded ? "rotate-180" : "")} />
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="ml-4 mt-0.5 grid gap-0.5 border-l border-border pl-2.5">
                                {item.children.map((child) => {
                                  const childIsActive = isItemActive(child, activeScreen, activeOrgPage);
                                  return (
                                    <button
                                      key={child.label}
                                      type="button"
                                      onClick={() => navigate(child)}
                                      aria-current={childIsActive ? "page" : undefined}
                                      className={cn(
                                        "flex items-center rounded-lg border-0 px-2.5 py-1.5 text-left text-[13px] font-medium shadow-none transition-colors",
                                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                                        childIsActive ? "bg-accent/15 text-amber-300" : "bg-transparent text-muted hover:bg-panel-3 hover:text-text"
                                      )}
                                    >
                                      <span className="flex-1">{child.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const badgeCount = navContext && item.badge ? item.badge(navContext) : undefined;

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => navigate(item)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border-0 px-2.5 py-2 text-left text-sm font-medium shadow-none transition-colors",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                            active ? "bg-accent/15 text-amber-300" : "bg-transparent text-muted hover:bg-panel-3 hover:text-text"
                          )}
                        >
                          <Icon size={16} className="shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {badgeCount ? (
                            <span
                              aria-hidden="true"
                              className="grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

export { SIDEBAR_WIDTH_PX };
