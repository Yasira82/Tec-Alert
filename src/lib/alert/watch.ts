// Server-only access to the Alert watchlist (C-111) via the API Gateway with the
// inter-service key. The watchlist is the caller's OWN self-created reminders (own-data,
// P6 — owner is the session identity, resolved by the BFF, never a client field). Alert
// Pro = unlimited watches; FREE is capped (enforced in the BFF from the live subscription,
// P5). NEW-A: the gateway URL is server-only (API_GATEWAY_URL) — never shipped to client.
const GW = process.env.API_GATEWAY_URL ?? '';

export const FREE_WATCH_CAP = 3;

const gwHeaders = (token?: string | null) => ({
  'Content-Type': 'application/json',
  'x-request-id': crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
  ...(token && { Authorization: `Bearer ${token}` }),
});

export interface Watch { id: string; title: string; note?: string; done: boolean; }

const toWatch = (o: Record<string, unknown>): Watch => ({
  id:    String(o.id ?? ''),
  title: String(o.title ?? ''),
  note:  o.note ? String(o.note) : undefined,
  done:  Boolean(o.done ?? false),
});

/** The caller's OWN watches (own-scope). [] on unreachable / no owner. */
export async function resolveWatches(owner: string | null): Promise<Watch[]> {
  if (!GW || !owner) return [];
  try {
    const res = await fetch(`${GW}/api/identity/alert/watch/${encodeURIComponent(owner)}`, { headers: gwHeaders(), cache: 'no-store' });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => ({})))?.data?.watches;
    return Array.isArray(rows) ? rows.map((w) => toWatch(w as Record<string, unknown>)) : [];
  } catch { return []; }
}

export interface CreateResult { ok: boolean; status: number; watch?: Watch; error?: string; }

/** Create a watch (owner = session identity, passed by the BFF, never the client body). */
export async function createWatch(owner: string, input: { title: string; note?: string }): Promise<CreateResult> {
  if (!GW) return { ok: false, status: 503, error: 'Alert is unavailable right now.' };
  try {
    const res = await fetch(`${GW}/api/identity/alert/watch`, {
      method: 'POST', headers: gwHeaders(), body: JSON.stringify({ owner, ...input }), cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) {
      const w = (json?.data as Record<string, unknown> | undefined)?.watch;
      return { ok: true, status: 201, watch: w ? toWatch(w as Record<string, unknown>) : undefined };
    }
    return { ok: false, status: res.status, error: res.status === 400 ? 'Please enter a title.' : 'Could not save. Please retry.' };
  } catch { return { ok: false, status: 503, error: 'Alert is unavailable right now.' }; }
}

/** Toggle a watch done/undone (owner-scoped). */
export async function setWatchDone(owner: string, id: string, done: boolean): Promise<boolean> {
  if (!GW || !owner) return false;
  try {
    const res = await fetch(`${GW}/api/identity/alert/watch/${encodeURIComponent(owner)}/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: gwHeaders(), body: JSON.stringify({ done }), cache: 'no-store',
    });
    return res.ok;
  } catch { return false; }
}

/** Delete the caller's OWN watch (owner-scoped). */
export async function deleteWatch(owner: string, id: string): Promise<boolean> {
  if (!GW || !owner) return false;
  try {
    const res = await fetch(`${GW}/api/identity/alert/watch/${encodeURIComponent(owner)}/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: gwHeaders(), cache: 'no-store',
    });
    return res.ok;
  } catch { return false; }
}

/** The caller's LIVE Alert-Pro entitlement — from commerce (Subscription owner, C-47).
 *  Alert never STORES billing (P5); it reflects it to lift the watch cap. Failure → false. */
export async function resolveProStatus(token: string | null): Promise<boolean> {
  if (!GW || !token) return false;
  try {
    const res = await fetch(`${GW}/api/commerce/subscriptions/status`, { headers: gwHeaders(token), cache: 'no-store' });
    if (!res.ok) return false;
    const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    // commerce returns { data: { subscription: {...} } } — unwrap the subscription
    // (a flat shape is also tolerated). Missing this returned FREE for real Pro users.
    const root = (d.data ?? d) as Record<string, unknown>;
    const s = ((root.subscription ?? root) ?? {}) as Record<string, unknown>;
    const plan = String(s.plan ?? s.tier ?? '').toUpperCase();
    const active  = s.isActive === true || s.active === true || (plan !== '' && plan !== 'FREE');
    const expired = s.isExpired === true;
    const end     = s.current_period_end ?? s.currentPeriodEnd ?? s.expires_at;
    const notExpired = !expired && (!end || new Date(String(end)).getTime() > Date.now());
    return active && notExpired && plan !== '' && plan !== 'FREE';
  } catch { return false; }
}
