import { ReactNode } from "react";

interface PageFrameProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

// Referee College Design System — Phase 2. Mirrors RefOps's PageFrame
// exactly (title/description/actions, consistent spacing and hierarchy).
// Not wired into any production screen yet — per the Phase 2 brief,
// individual page internals are migrated in a later phase. This exists so
// that migration has a ready-made, RefOps-equivalent primitive to adopt
// screen-by-screen, instead of each screen re-inventing its own page-header
// markup the way `.ed-dash-header`, `.lh-hero`, `.rv-context` etc. currently
// each do.
export function PageFrame({ title, description, actions, children }: PageFrameProps) {
  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
