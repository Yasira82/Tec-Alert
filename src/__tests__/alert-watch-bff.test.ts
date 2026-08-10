// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// TEC Alert — watchlist BFF (C-111). The caller's OWN reminders. Identity is the session
// (P6 — never a client field). The FREE cap is enforced server-side from the live
// subscription (P5): a non-Pro at the cap is refused; a Pro is unlimited.
const GW = 'https://api.example.com';
process.env.API_GATEWAY_URL = GW;
process.env.INTERNAL_SECRET = 'secret';

const makeReq = (opts: { cookies?: Record<string, string>; body?: unknown; method?: string }) => {
  const cookieStr = opts.cookies ? Object.entries(opts.cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ') : '';
  const headers: Record<string, string> = {};
  if (cookieStr) headers['Cookie'] = cookieStr;
  return new NextRequest('http://localhost/api/bff/alert/watch', {
    method: opts.method ?? 'POST', headers, body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
};
const ok = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => ({ data }) } as Response);
const maya = JSON.stringify({ piUsername: 'maya' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.API_GATEWAY_URL = GW;
  process.env.INTERNAL_SECRET = 'secret';
});

describe('POST /api/bff/alert/watch (create, free-cap gated)', () => {
  it('401 without a session (identity from the cookie, P6)', async () => {
    const { POST } = await import('@/app/api/bff/alert/watch/route');
    const res = await POST(makeReq({ body: { title: 'Watch Pi' } }));
    expect(res.status).toBe(401);
  });

  it('400 on an empty title', async () => {
    const { POST } = await import('@/app/api/bff/alert/watch/route');
    const res = await POST(makeReq({ cookies: { tec_user: maya }, body: { title: '   ' } }));
    expect(res.status).toBe(400);
  });

  it('403 for a non-Pro already at the free cap (P5 — no create)', async () => {
    const three = [1, 2, 3].map((i) => ({ id: String(i), title: `w${i}`, done: false }));
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(ok({ subscription: { plan: 'FREE', isActive: true } }))  // sub = not Pro
      .mockResolvedValueOnce(ok({ watches: three }));                                 // at cap (3)
    const { POST } = await import('@/app/api/bff/alert/watch/route');
    const res = await POST(makeReq({ cookies: { tec_user: maya, tec_access_token: 'tok' }, body: { title: 'One more' } }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.capped).toBe(true);
    // create was never called (only sub + list)
    expect(fetchSpy.mock.calls.some(([u, init]) => String(u).endsWith('/api/identity/alert/watch') && (init as RequestInit)?.method === 'POST')).toBe(false);
    fetchSpy.mockRestore();
  });

  it('a live Pro creates past the cap (unlimited — unwraps { data: { subscription } })', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(ok({ subscription: { plan: 'PRO', isActive: true, isExpired: false } }))  // sub = Pro
      .mockResolvedValueOnce(ok({ watch: { id: 'w9', title: 'One more', done: false } }, 201));         // create
    const { POST } = await import('@/app/api/bff/alert/watch/route');
    const res = await POST(makeReq({ cookies: { tec_user: maya, tec_access_token: 'tok' }, body: { title: 'One more', owner: 'HACKER' } }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    const create = fetchSpy.mock.calls.find(([u]) => String(u).endsWith('/api/identity/alert/watch'));
    expect(JSON.parse((create![1] as RequestInit).body as string).owner).toBe('maya'); // session, not body's HACKER
    fetchSpy.mockRestore();
  });
});
