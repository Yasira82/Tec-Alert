import { NextRequest, NextResponse } from 'next/server';
import { type Source } from '@/lib/alert/feed';
import { resolveFeed, feedUnread } from '@/lib/alert/server';

// GET /api/bff/alert/feed?source=all|tec|pi — the notification feed (C-111).
// Alert aggregates + classifies signals from TEC apps + the Pi community. Proxies
// the caller's OWN notifications from the backend (identity from the `tec_user`
// session cookie server-side — NEVER a param, P6) + the global Pi-community feed,
// returning source:'live'; falls back to the curated sample (source:'sample') if the
// backend is unreachable, so the inbox is never blank. Read-only. NEW-A: gateway URL
// is server-only.
function ownerFromSession(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get('tec_user')?.value ?? '';
    if (!raw) return null;
    let u: Record<string, unknown>;
    try { u = JSON.parse(raw); } catch { u = JSON.parse(decodeURIComponent(raw)); }
    const owner = (u.piUsername ?? u.username) as string | undefined;
    return owner && owner.trim() ? owner : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('source') ?? 'all';
  const src = (['all', 'tec', 'pi'] as const).includes(raw as Source | 'all') ? (raw as Source | 'all') : 'all';
  const owner = ownerFromSession(req);
  const { feed, source } = await resolveFeed(owner, src);
  return NextResponse.json(
    { source, feed, count: feed.length, unread: feedUnread(feed) },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}
