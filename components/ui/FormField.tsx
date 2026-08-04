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
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <span className="text-accent"> *</span>}
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
