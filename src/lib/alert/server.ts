import {
  unreadCount,
  type Alert, type Source, type Category, type Severity,
} from './feed';

// Server-only Alert backend access (C-111). Calls the real Alert read-layer
// (identity-service) via the gateway with the inter-service key, and maps the
// backend rows to the frontend shape. Real data end-to-end (C-135 §4): an
// unreachable backend resolves to `unavailable` (empty inbox) — never a fabricated
// sample. NEW-A: the gateway URL is server-only (API_GATEWAY_URL) — never shipped
// to the client.
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

export interface ResolvedFeed { feed: Alert[]; source: 'live' | 'unavailable'; }

// The caller's feed (own TEC alerts + global Pi community) for a source filter —
// live backend only. `owner` is derived from the session by the BFF (never a client
// param, P6); the gateway placeholder '-' means no session (community only). An
// unreachable backend resolves to (feed: [], source: 'unavailable') so the inbox
// shows an honest empty state — never a fabricated sample (C-135 §4).
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
    } catch { /* unreachable → unavailable below */ }
  }
  return { feed: [], source: 'unavailable' };
}

export const feedUnread = (feed: Alert[]): number => unreadCount(feed);

export interface ResolvedAlert { alert: Alert | null; source: 'live' | 'unavailable'; }

// One alert by id — live backend only. A live 404 is authoritative (alert: null,
// source: 'live'); an unreachable backend resolves to (alert: null, source:
// 'unavailable'). Never a fabricated sample.
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
    } catch { /* unreachable → unavailable below */ }
  }
  return { alert: null, source: 'unavailable' };
}
