"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { useModalA11y } from "@/lib/hooks/useModalA11y";
import { Button } from "@/components/ui/Button";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  busyLabel = "Deleting…",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useModalA11y<HTMLDivElement>(true, onCancel);
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" onClick={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 id={titleId} className="m-0 text-lg">{title}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close" disabled={busy}>
            <X size={16} />
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <div className="action-row mt-5">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
