import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  "aria-label"?: string;
}

// Extracted from Organisation Settings' formerly-duplicated `OrgToggle` —
// same visual behaviour (44x26 pill, sliding 20px knob) but expressed via
// tokens (bg-accent/bg-panel-3) instead of hardcoded hex.
export function Switch({ checked, onChange, disabled, label, ...rest }: SwitchProps) {
  const ariaLabel = rest["aria-label"] ?? label;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6.5 w-11 shrink-0 rounded-full border-none p-0 shadow-none transition-colors",
        checked ? "bg-accent" : "bg-panel-3",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.4)] transition-[left] duration-150",
          checked ? "left-[21px]" : "left-[3px]"
        )}
      />
    </button>
  );
}
