import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageFrameProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

// Referee College Design System — Phase 2/3. Mirrors RefOps's PageFrame
// (title/description/actions, consistent spacing and hierarchy), extended
// in Phase 3 with:
//   - an optional `eyebrow` (RefEval's existing `.eyebrow` convention, e.g.
//     "Educator Portal" / "Referee Portal" / "Organisation") — RefOps's
//     PageFrame doesn't need this since its pages don't carry a portal
//     label, but every RefEval screen being migrated does.
//   - a `className` override (merged via cn(), not replaced) so a screen
//     that already sits inside a padded structural container (e.g.
//     `.ed-layout`/`.ed-main`) can cancel PageFrame's own padding instead
//     of double-padding.
export function PageFrame({ eyebrow, title, description, actions, children, className }: PageFrameProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 p-4 sm:p-6 lg:p-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
          )}
          <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
