export function getYouTubeId(link: string): string {
  if (!link.trim()) return "";
  try {
    const url = new URL(link.trim());
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || "";
      return url.searchParams.get("v") || "";
    }
    if (host.includes("youtu.be")) return url.pathname.replace(/^\//, "").split(/[?#]/)[0];
  } catch { }
  return "";
}

export function embedUrl(link: string, seconds: number, autoplay = false): string {
  if (!link.trim()) return "";
  const videoId = getYouTubeId(link);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(Math.max(0, seconds))}&autoplay=${autoplay ? 1 : 0}&enablejsapi=1&rel=0`;
  }
  return link;
}
