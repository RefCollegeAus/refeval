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
