import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-panel-3", className)} {...props} />;
}
