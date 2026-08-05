import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {/* flex overrides the legacy global `label{display:grid}` rule (app/globals.css),
          which would otherwise stack the label text and the required asterisk onto
          separate lines. */}
      <label htmlFor={htmlFor} className="flex items-baseline gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <span className="text-accent">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
