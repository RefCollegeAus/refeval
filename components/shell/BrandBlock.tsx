import { cn } from "@/lib/utils/cn";

type BrandVariant = "header" | "auth";

interface BrandBlockProps {
  variant?: BrandVariant;
  className?: string;
}

// Referee College of Australia brand lockup for RefEval's shell — mirrors
// RefOps's BrandBlock (same eyebrow-then-product-name structure, same RCA
// crest) so the two products read as the same family.
//
// The authenticated app shell (this component's "header" variant) shows
// "RefEval" as the product name. The "auth" variant (login/reset-password
// screens) still shows "RefCoach", matching the browser tab title and every
// other pre-authentication surface — deliberately out of scope for this
// header-alignment pass, which only touches the visible authenticated-shell
// label, not a repo-wide product rename.
export function BrandBlock({ variant = "header", className }: BrandBlockProps) {
  const isAuth = variant === "auth";
  const productName = isAuth ? "RefCoach" : "RefEval";

  return (
    <div
      className={cn(
        isAuth ? "flex flex-col items-center gap-2 text-center" : "flex items-center gap-3.5 sm:gap-4",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no next/image config in this project */}
      <img
        src="/rca-logo.png"
        alt="Referee College of Australia logo"
        className={cn(
          "w-auto object-contain",
          isAuth ? "h-[72px]" : "h-9 sm:h-[68px]"
        )}
      />
      <div className={cn("min-w-0", isAuth ? "leading-tight" : "leading-none")}>
        <p
          className={cn(
            "m-0 font-bold uppercase text-accent",
            isAuth ? "text-[11px] font-black tracking-wider" : "hidden text-[11px] tracking-[0.2em] sm:block"
          )}
        >
          Referee College of Australia
        </p>
        <p
          className={cn(
            "m-0 font-bold tracking-tight text-text",
            isAuth ? "text-lg" : "text-lg leading-none sm:mt-2 sm:text-[30px]"
          )}
        >
          {productName}
        </p>
      </div>
    </div>
  );
}
