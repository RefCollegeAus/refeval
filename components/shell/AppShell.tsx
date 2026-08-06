import type { ComponentProps, ReactNode } from "react";
import { Header } from "@/components/Header";

type HeaderProps = ComponentProps<typeof Header>;

// Referee College Design System — Platform Unification phase. Mirrors
// RefOps's AppShell: one component owns the page gutter (`p-4 sm:p-6
// lg:p-8`) so PageFrame doesn't have to — every screen wired through this
// passes `className="p-0"` to its own PageFrame instead of re-deriving the
// gutter itself, exactly like SettingsLayout's SettingsPage already does for
// Organisation Settings. Header still renders the Sidebar internally (see
// Header.tsx) — this wrapper only adds the padded content region RefEval
// never had, since screens here are conditional branches of one component
// rather than routed pages with a shared layout.
export function AppShell({
  children,
  contentClassName,
  ...headerProps
}: HeaderProps & { children: ReactNode; /** Overrides the default page gutter — for screens (e.g. the video-first reviewer workspace) that need a tighter or custom content inset. */ contentClassName?: string }) {
  return (
    <main>
      <Header {...headerProps} />
      <div className={contentClassName ?? "p-4 sm:p-6 lg:p-8"}>{children}</div>
    </main>
  );
}
