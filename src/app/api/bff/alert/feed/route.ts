import { NextRequest, NextResponse } from 'next/server';
import { FEED, filterFeed, unreadCount, type Source } from '@/lib/alert/feed';

// GET /api/bff/alert/feed?source=all|tec|pi — the notification feed (C-111).
// Alert aggregates + classifies signals from TEC apps + the Pi community. This V1
// serves a curated read-only SAMPLE (source:'sample'); when live, it proxies the
// caller's OWN notifications from tec-notification-service (identity from the
// session cookie, never a param — P6) + a curated Pi-community source, returning
// source:'live' with the same shape. Read-only.
export function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('source') ?? 'all';
  const src = (['all', 'tec', 'pi'] as const).includes(raw as Source | 'all') ? (raw as Source | 'all') : 'all';
  const feed = filterFeed({ source: src });
  return NextResponse.json(
    { source: 'sample', feed, count: feed.length, unread: unreadCount(feed) },
    { headers: { 'Cache-Control': 'private, max-age=30' } },
  );
}
