// ── Relative / formatted date helpers (shared across learning components) ─────

export function fmtRel(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Video time helpers ────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds || 0);
  const s = Math.floor(safe % 60).toString().padStart(2, "0");
  const m = Math.floor((safe / 60) % 60).toString().padStart(2, "0");
  const h = Math.floor(safe / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function makeTimestampLink(baseLink: string, seconds: number): string {
  if (!baseLink.trim()) return "";
  const clean = baseLink.trim();
  const rounded = Math.max(0, Math.floor(seconds));
  try {
    const url = new URL(clean);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) url.searchParams.set("t", `${rounded}s`);
    else if (host.includes("drive.google.com")) url.hash = `t=${rounded}`;
    else url.searchParams.set("t", `${rounded}`);
    return url.toString();
  } catch {
    return `${clean}#t=${rounded}`;
  }
}
