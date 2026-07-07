// Lightweight event-based toast — no React context needed.
// Call showToast() from anywhere (hooks, components, API callbacks).
// Render <AppToast /> once at the root to display the notification.

export type ToastType = "error" | "success" | "info";

export interface ToastPayload {
  message: string;
  type: ToastType;
}

const EVENT_NAME = "refcoach:toast";

export function showToast(message: string, type: ToastType = "error") {
  if (typeof window === "undefined") return;
  const payload: ToastPayload = { message, type };
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
}

export function onToast(handler: (payload: ToastPayload) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<ToastPayload>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
