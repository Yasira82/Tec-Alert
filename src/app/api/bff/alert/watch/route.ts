import { NextRequest, NextResponse } from 'next/server';
import { resolveWatches, createWatch, resolveProStatus, FREE_WATCH_CAP } from '@/lib/alert/watch';

// The caller's OWN Alert watchlist (C-111). Identity is the `tec_user` session cookie
// server-side — NEVER a client field (P6). GET returns the watches + the caller's Pro
// status + the free cap. POST creates a watch; the FREE cap is enforced HERE from the
// live subscription (P5 — Alert never stores billing): a non-Pro at the cap is refused.
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
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ watches: [], isPro: false, cap: FREE_WATCH_CAP }, { status: 401 });
  const [watches, isPro] = await Promise.all([
    resolveWatches(owner),
    resolveProStatus(req.cookies.get('tec_access_token')?.value ?? null),
  ]);
  return NextResponse.json({ watches, isPro, cap: FREE_WATCH_CAP }, { headers: { 'Cache-Control': 'private, max-age=15' } });
}

export async function POST(req: NextRequest) {
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ error: 'Sign in to add a watch.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { title?: unknown; note?: unknown };
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Please enter a title.' }, { status: 400 });

  // FREE cap enforced server-side from the live subscription (P5).
  const isPro = await resolveProStatus(req.cookies.get('tec_access_token')?.value ?? null);
  if (!isPro) {
    const current = await resolveWatches(owner);
    if (current.length >= FREE_WATCH_CAP) {
      return NextResponse.json(
        { error: `Free plan is ${FREE_WATCH_CAP} watches. Alert Pro = unlimited.`, capped: true },
        { status: 403 },
      );
    }
  }

  const r = await createWatch(owner, { title, note: typeof body.note === 'string' ? body.note : undefined });
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Could not save.' }, { status: r.status });
  return NextResponse.json({ ok: true, watch: r.watch });
}
