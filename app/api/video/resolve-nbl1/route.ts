import { NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Strategy 1 — direct embed URL (unescaped)
// https://ott.nbl.com.au/en-int/embed/2185026
const DIRECT_RE = /(?:https?:)?\/\/ott\.nbl\.com\.au\/[^"'\s]*\/embed\/(\d+)/i;

// Strategy 2 — JSON-escaped embed URL
// https:\/\/ott.nbl.com.au\/en-int\/embed\/2185026
const ESCAPED_RE = /https?:\\\/\\\/ott\.nbl\.com\.au\\\/[^"'\s]*\\\/embed\\\/(\d+)/i;

// Strategy 3 — numeric ID associated with recognised key names
// Matches: "videoId": "2185026", videoId=2185026, "assetId":"2185026" etc.
const KEY_RE = /(?:videoId|video_id|contentId|content_id|assetId|asset_id|mediaId|media_id|in_player)[^0-9]{0,20}?(\d{5,10})/i;

function tryExtract(html: string): { embedId: string; strategy: string } | null {
  let m: RegExpExecArray | null;

  m = DIRECT_RE.exec(html);
  if (m) return { embedId: m[1], strategy: "direct_embed_url" };

  m = ESCAPED_RE.exec(html);
  if (m) return { embedId: m[1], strategy: "escaped_embed_url" };

  // Also search inside __NEXT_DATA__ JSON block if present
  const nextDataMatch = /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (nextDataMatch) {
    const chunk = nextDataMatch[1];

    m = DIRECT_RE.exec(chunk);
    if (m) return { embedId: m[1], strategy: "direct_embed_url" };

    m = ESCAPED_RE.exec(chunk);
    if (m) return { embedId: m[1], strategy: "escaped_embed_url" };

    m = KEY_RE.exec(chunk);
    if (m) return { embedId: m[1], strategy: "numeric_content_id" };
  }

  m = KEY_RE.exec(html);
  if (m) return { embedId: m[1], strategy: "numeric_content_id" };

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const gameUrl = searchParams.get("url");

  if (!gameUrl) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(gameUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "nbl1.com.au" || !parsed.pathname.startsWith("/games/")) {
    return NextResponse.json({ error: "URL is not an NBL1 game page." }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(gameUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RefCoach/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `NBL1 page returned HTTP ${res.status}. Try pasting the NBL OTT embed link directly.` },
        { status: 502 }
      );
    }
    html = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json(
      { error: `Could not fetch the NBL1 game page: ${msg}. Try pasting the NBL OTT embed link directly.` },
      { status: 502 }
    );
  }

  const result = tryExtract(html);
  if (!result) {
    return NextResponse.json(
      { error: "Could not find an embedded NBL video for this game page. Try pasting the NBL OTT embed link directly." },
      { status: 404 }
    );
  }

  const embedUrl = `https://ott.nbl.com.au/en-int/embed/${result.embedId}`;
  return NextResponse.json({
    embedUrl,
    ...(isDev ? { _strategy: result.strategy } : {}),
  }, { status: 200 });
}
