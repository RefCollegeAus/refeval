import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "accent" | "good" | "warn" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

// Consolidates the three parallel ad hoc badge systems already in RefEval's
// legacy CSS (.status/.status-badge/.role-badge) into one tone-based
// primitive, structurally identical to RefOps's Badge. Role-specific tones
// (super_admin/educator/viewer, etc, from .role-badge) aren't ported here —
// they're an extension for whichever screen migration wires this in, not
// part of the foundational 5-tone set RefOps itself defines.
const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-panel-3 text-text/70 border-border",
  accent: "bg-accent/15 text-amber-300 border-accent/40",
  good: "bg-good/15 text-green-300 border-good/40",
  warn: "bg-warn/15 text-yellow-300 border-warn/40",
  danger: "bg-danger/15 text-red-300 border-danger/40",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
