import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[84px] w-full resize-y rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted",
          "outline-none focus:border-accent",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
