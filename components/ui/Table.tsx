import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

// The `.rcds-table` class (defined in app/globals.css, outside the legacy
// layer) generalises the responsive card-collapse pattern RefEval already
// proved out for the referee "My Reviews" table (`.ref-reviews-table`) so
// every Table instance gets it, not just the one screen that happened to
// need it first. Pass `data-label` on TableCell to control the mobile
// row-label text (mirrors the existing pattern's `td::before` mechanism).
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="rcds-table overflow-x-auto rounded-2xl border border-border">
      <table className={cn("w-full min-w-[640px] border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-panel-2", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border last:border-0", className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-top text-text", className)} {...props} />;
}
