import { cn } from "@/lib/utils/cn";

type BrandVariant = "header" | "auth";

interface BrandBlockProps {
  variant?: BrandVariant;
  className?: string;
}

// Referee College of Australia brand lockup for RefEval's shell — mirrors
// RefOps's BrandBlock (same eyebrow-then-product-name structure, same RCA
// crest) so the two products read as the same family. Product name is
// "RefCoach" — that's the name already shown consistently across RefEval's
// login screen, browser tab title and (until now) Header.tsx; this
// component intentionally does not introduce "RefEval" into the UI, which
// would newly diverge from those existing surfaces. See the naming note in
// the Phase 2 shell-alignment report for the one remaining out-of-shell
// inconsistency (the set-password auth screen) left for a future pass.
export function BrandBlock({ variant = "header", className }: BrandBlockProps) {
  const isAuth = variant === "auth";

  return (
    <div
      className={cn(
        isAuth ? "flex flex-col items-center gap-2 text-center" : "flex items-center gap-3 sm:gap-3.5",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no next/image config in this project */}
      <img
        src="/rca-logo.png"
        alt="Referee College of Australia logo"
        className={cn(
          "w-auto object-contain drop-shadow-[0_4px_16px_rgba(165,106,27,0.28)]",
          isAuth ? "h-16" : "h-8 sm:h-10"
        )}
      />
      <div className={cn("min-w-0", isAuth ? "leading-tight" : "leading-none")}>
        <p
          className={cn(
            "font-bold uppercase text-accent",
            isAuth ? "text-[11px] font-black tracking-wider" : "hidden text-[10px] tracking-[0.18em] sm:block"
          )}
        >
          Referee College of Australia
        </p>
        <p
          className={cn(
            "font-bold tracking-tight text-text",
            isAuth ? "text-lg" : "text-base leading-none sm:mt-1.5 sm:text-xl"
          )}
        >
          RefCoach
        </p>
      </div>
    </div>
  );
}
