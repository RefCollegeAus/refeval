"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
  content: ReactNode;
}

// Local-state tabs, not URL-synced — RefOps's Tabs syncs to ?tab= because
// its screens are real Next.js routes. RefEval's screens are mostly
// switched via app/page.tsx's client-side `screen` state rather than
// routing (see the Navigation audit in REFEVAL_MODERNISATION_PLAN.md), so
// there's no stable pathname for a query param to attach to across most of
// the product. Same visual/accessibility contract as RefOps's version
// (role=tablist, aria-selected, horizontal scroll instead of wrap on
// mobile) — only the state mechanism differs.
export function Tabs({
  tabs,
  ariaLabel = "Tabs",
  activeId: controlledActiveId,
  onChange,
}: {
  tabs: TabItem[];
  ariaLabel?: string;
  /** Omit for self-managed (uncontrolled) tab state. Pass alongside `onChange` when
   *  something outside the tab bar itself (e.g. a "view all" link) needs to switch tabs. */
  activeId?: string;
  onChange?: (id: string) => void;
}) {
  const [internalActiveId, setInternalActiveId] = useState(tabs[0]?.id);
  const activeId = controlledActiveId ?? internalActiveId;
  const setActiveId = onChange ?? setInternalActiveId;
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                isActive ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`tabpanel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active?.id}
        >
          {tab.id === active?.id ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
