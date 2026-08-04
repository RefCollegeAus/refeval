import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "good" | "ghost";
export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Every variant sets border, background, color, font-weight and shadow
// explicitly — not just the ones that differ from the legacy `button{}`
// rule — so nothing leaks through from the (deliberately lower-priority)
// `legacy` CSS layer when this renders alongside existing screens.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-accent to-accent-2 text-white border-transparent shadow-sm hover:brightness-110",
  secondary: "bg-panel-3 text-text border-border hover:border-accent",
  danger: "bg-danger/15 text-red-300 border-danger/40 hover:bg-danger/25",
  good: "bg-good/15 text-green-300 border-good/40 hover:bg-good/25",
  ghost: "bg-transparent text-text border-transparent hover:bg-panel-3",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function buttonClasses(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center rounded-xl border font-semibold whitespace-nowrap transition-colors",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={buttonClasses(variant, size, className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
