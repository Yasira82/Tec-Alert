import {
  FEED, filterFeed, unreadCount, getAlert,
  type Alert, type Source, type Category, type Severity,
} from './feed';

// Server-only Alert backend access (C-111). Calls the real Alert read-layer
// (identity-service) via the gateway with the inter-service key, and maps the
// backend rows to the frontend shape. Everything degrades to the curated sample so
// the inbox is never blank / never 500s. NEW-A: the gateway URL is server-only
// (API_GATEWAY_URL) — never shipped to the client.
const GW = process.env.API_GATEWAY_URL ?? '';

const gwHeaders = () => ({
  'Content-Type': 'application/json',
  'x-request-id': crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
});

// backend (alert_notifications) → frontend Alert.
export function alertFromBackend(a: Record<string, unknown>): Alert {
  return {
    id:       String(a.slug ?? ''),
    source:   String(a.source ?? 'TEC').toLowerCase() as Source,
    category: String(a.category ?? 'community').toLowerCase() as Category,
    severity: String(a.severity ?? 'info').toLowerCase() as Severity,
    title:    String(a.title ?? ''),
    body:     String(a.body ?? ''),
    app:      String(a.app ?? ''),
    ago:      String(a.ago ?? ''),
    unread:   Boolean(a.unread),
  };
}

export interface ResolvedFeed { feed: Alert[]; source: 'live' | 'sample'; }

// The caller's feed (own TEC alerts + global Pi community) for a source filter —
// live backend first, curated sample as fallback. `owner` is derived from the
// session by the BFF (never a client param, P6); the gateway placeholder '-' means
// no session (community only). The frontend applies category filtering client-side.
export async function resolveFeed(owner: string | null, source: Source | 'all'): Promise<ResolvedFeed> {
  if (GW) {
    try {
      const res = await fetch(
        `${GW}/api/identity/alert/feed/${encodeURIComponent(owner || '-')}?source=${encodeURIComponent(source)}`,
        { headers: gwHeaders(), cache: 'no-store' },
      );
      if (res.ok) {
        const rows = (await res.json().catch(() => ({})))?.data?.feed;
        if (Array.isArray(rows)) return { feed: rows.map((a) => alertFromBackend(a as Record<string, unknown>)), source: 'live' };
      }
    } catch { /* fall through to the curated sample */ }
  }
  return { feed: filterFeed({ source }), source: 'sample' };
}

export const feedUnread = (feed: Alert[]): number => unreadCount(feed);

export interface ResolvedAlert { alert: Alert | null; source: 'live' | 'sample'; }

// One alert by id — live backend first, sample fallback. A live 404 is
// authoritative (alert: null, source: 'live').
export async function resolveAlert(id: string): Promise<ResolvedAlert> {
  if (GW) {
    try {
      const res = await fetch(`${GW}/api/identity/alert/alert/${encodeURIComponent(id)}`, {
        headers: gwHeaders(), cache: 'no-store',
      });
      if (res.ok) {
        const a = (await res.json().catch(() => ({})))?.data?.alert;
        if (a) return { alert: alertFromBackend(a as Record<string, unknown>), source: 'live' };
      }
      if (res.status === 404) return { alert: null, source: 'live' };
    } catch { /* fall through to the curated sample */ }
  }
  return { alert: getAlert(id) ?? (FEED.find((x) => x.id === id) ?? null), source: 'sample' };
}
