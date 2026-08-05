"use client";

import { useState } from "react";
import { User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface UserMenuProps {
  userInitials: string;
  userName: string;
  onProfile: () => void;
  onLogout: () => void;
  isProfileActive?: boolean;
}

// RCA-shell account avatar + dropdown, mirroring RefOps's UserMenu.tsx
// structure exactly (same trigger sizing/ring treatment, same panel
// chrome). RefEval's avatar previously navigated straight to the Profile
// screen with a separate permanent Logout icon beside it; both now live
// here as menu items, reusing the same onProfile/onLogout handlers every
// call site already passes to Header — no navigation or auth behaviour
// changed, only where the controls that trigger it live.
export function UserMenu({ userInitials, userName, onProfile, onLogout, isProfileActive }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={isProfileActive ? "page" : undefined}
        title={userName}
        className="grid h-9 w-9 place-items-center rounded-full border-0 bg-accent/20 text-xs font-bold text-amber-300 shadow-none ring-1 ring-inset ring-accent/30 transition-colors hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {userInitials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label="Account"
            className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-panel shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onProfile(); }}
              className={cn(
                "flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-2.5 text-left text-sm font-medium shadow-none transition-colors hover:bg-panel-3",
                isProfileActive ? "text-amber-300" : "text-text"
              )}
            >
              <User size={15} className="text-muted" />
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-2.5 text-left text-sm font-medium text-text shadow-none transition-colors hover:bg-panel-3"
            >
              <LogOut size={15} className="text-muted" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
