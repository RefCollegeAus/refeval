"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { onToast, type ToastPayload } from "@/lib/toast";

// Renders at document.body via a portal — safe to instantiate multiple times
// (only the first mounted instance will actually show; extras return null after
// the portal target is claimed, but in practice only one is ever mounted).
export function AppToast() {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const styles: Record<string, { bg: string; border: string; color: string }> = {
    error:   { bg: "rgba(239,68,68,.18)",  border: "rgba(239,68,68,.5)",  color: "#fecaca" },
    success: { bg: "rgba(34,197,94,.18)",  border: "rgba(34,197,94,.45)", color: "#bbf7d0" },
    info:    { bg: "rgba(99,102,241,.18)", border: "rgba(99,102,241,.45)", color: "#c7d2fe" },
  };
  const s = styles[toast.type] ?? styles.info;
  const Icon = toast.type === "error" ? XCircle : toast.type === "success" ? CheckCircle2 : Info;

  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        borderRadius: 12,
        padding: "12px 16px",
        fontSize: 13,
        fontWeight: 600,
        maxWidth: "min(480px, calc(100vw - 40px))",
        boxShadow: "0 8px 32px rgba(0,0,0,.5)",
        backdropFilter: "blur(8px)",
        lineHeight: 1.4,
        pointerEvents: "auto",
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: s.color,
          opacity: 0.7,
          flexShrink: 0,
          marginTop: 1,
          lineHeight: 1,
        }}
      >
        <X size={14} />
      </button>
    </div>,
    document.body,
  );
}
