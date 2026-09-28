// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// C-111 (2026-09-28): a platform-wide finding is shown only to an operator. The
// backend decides from `?owner=` — the viewer resolved from the session — so the
// detail page must send it, and must not invent one when there is no session.
const GW = 'https://api.example.com';

beforeEach(() => {
  vi.resetModules();
  process.env.API_GATEWAY_URL = GW;
  process.env.INTERNAL_SECRET = 'secret';
});

const ok = () => new Response(JSON.stringify({ data: { alert: { slug: 'x' } } }), { status: 200 });

describe('resolveAlert — viewer', () => {
  it('passes the session viewer as ?owner=', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { resolveAlert } = await import('@/lib/alert/server');
    await resolveAlert('finding-total_payments-2026-09-14', 'yasser');
    expect(fetchMock).toHaveBeenCalledWith(`${GW}/api/identity/alert/alert/finding-total_payments-2026-09-14?owner=yasser`, expect.anything());
  });

  it('sends no owner when there is no session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { resolveAlert } = await import('@/lib/alert/server');
    await resolveAlert('pi-mainnet-1', null);
    expect(fetchMock).toHaveBeenCalledWith(`${GW}/api/identity/alert/alert/pi-mainnet-1`, expect.anything());
  });

  it('a 404 (not an operator, or not found) is an authoritative "not found"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    const { resolveAlert } = await import('@/lib/alert/server');
    expect(await resolveAlert('finding-x', 'pioneer')).toEqual({ alert: null, source: 'live' });
  });
});
