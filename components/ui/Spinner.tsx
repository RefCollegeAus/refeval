import { cn } from "@/lib/utils/cn";

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 18, className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block animate-spin rounded-full border-2 border-border border-t-accent", className)}
      style={{ width: size, height: size }}
    />
  );
}
