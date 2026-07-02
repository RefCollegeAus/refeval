"use client";

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
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-title">
          <div>
            <h1 style={{ fontSize: 18, margin: 0 }}>{title}</h1>
          </div>
          <button onClick={onCancel} aria-label="Close" disabled={busy}>✕</button>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--muted)" }}>{message}</p>
        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="danger" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
