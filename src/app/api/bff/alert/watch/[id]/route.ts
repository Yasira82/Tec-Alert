import { NextRequest, NextResponse } from 'next/server';
import { setWatchDone, deleteWatch } from '@/lib/alert/watch';

// PATCH / DELETE a single watch (C-111). Owner is the `tec_user` session identity
// server-side (P6 — the backend scopes every mutation to owner, so a caller can only
// ever touch their OWN row). CSRF is enforced in middleware only (C-12 §11).
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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { done?: unknown };
  const ok = await setWatchDone(owner, id, body.done === true);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteWatch(owner, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
