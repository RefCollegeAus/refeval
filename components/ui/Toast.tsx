"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { onToast, type ToastPayload } from "@/lib/toast";
import { useMounted } from "@/lib/hooks/useMounted";

// Token-driven equivalent of the existing AppToast.tsx, which this phase
// deliberately leaves untouched and mounted (see components/common/AppToast.tsx) —
// it hardcodes the same colours as local rgba() literals instead of
// referencing shared tokens. This component reads from the same
// lib/toast.ts pub-sub, so swapping AppToast for ToastViewport in the root
// layout later is a one-line change with no behaviour difference.
// lib/toast.ts's ToastType is error/success/info only (no "warning") —
// intentionally not extended in this phase to avoid touching a file the
// currently-mounted AppToast.tsx also depends on.
const toneClasses: Record<ToastPayload["type"], string> = {
  success: "border-good/40 bg-good/15 text-green-200",
  error: "border-danger/40 bg-danger/15 text-red-200",
  info: "border-info/40 bg-info/15 text-indigo-200",
};

const icons: Record<ToastPayload["type"], typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastViewport() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const mounted = useMounted();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onToast((payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(payload);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 4500);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!mounted || !toast || !visible) return null;

  const Icon = icons[toast.type];

  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-5 left-1/2 z-[9999] flex max-w-[min(480px,calc(100vw-40px))] -translate-x-1/2 items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur ${toneClasses[toast.type]}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 opacity-70 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>,
    document.body
  );
}
