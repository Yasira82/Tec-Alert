'use client';

// TEC Alert (C-111) — Watchlist. Turns Alert from a read-only inbox into a two-way tool:
// your OWN self-created reminders ("watch this / remind me"). Self-declared own-data
// (P6 — identity is your session, never sent by the app). Alert Pro = unlimited watches;
// FREE is capped (enforced server-side, P5). Additive — it takes away nothing free.
import { useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';

interface Watch { id: string; title: string; note?: string; done: boolean; }

const card = { background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`, borderRadius: 12, padding: 16 } as const;
const field = { width: '100%', background: TEC_COLORS.bg, color: TEC_COLORS.text, border: `1px solid ${TEC_COLORS.gold}33`, borderRadius: 10, padding: '10px 12px', fontSize: 14 } as const;
const goldBtn = { background: `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})`, color: '#0a0800', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' } as const;

export function Watchlist() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [cap, setCap] = useState(3);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    fetch('/api/bff/alert/watch', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { watches?: Watch[]; isPro?: boolean; cap?: number } | null) => {
        if (!j) return;
        setWatches(j.watches ?? []);
        setIsPro(Boolean(j.isPro));
        if (typeof j.cap === 'number') setCap(j.cap);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  };
  useEffect(load, []);

  const atCap = !isPro && watches.length >= cap;

  const add = async () => {
    const t = title.trim();
    if (!t || busy) { if (!t) setMsg('Enter something to watch.'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/bff/alert/watch', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; watch?: Watch; error?: string };
      if (res.status === 401) { setMsg('Sign in to add a watch.'); return; }
      if (res.status === 403) { setMsg(j.error ?? 'Free limit reached — Alert Pro is unlimited.'); return; }
      if (!res.ok || !j.watch) { setMsg(j.error ?? 'Could not save. Please retry.'); return; }
      setWatches((w) => [j.watch!, ...w]);
      setTitle('');
    } catch { setMsg('Network error. Please retry.'); }
    finally { setBusy(false); }
  };

  const toggle = async (w: Watch) => {
    setWatches((list) => list.map((x) => (x.id === w.id ? { ...x, done: !x.done } : x)));
    try { await fetch(`/api/bff/alert/watch/${encodeURIComponent(w.id)}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !w.done }) }); } catch {}
  };
  const remove = async (id: string) => {
    setWatches((list) => list.filter((x) => x.id !== id));
    try { await fetch(`/api/bff/alert/watch/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' }); } catch {}
  };

  if (!loaded) return null;

  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Your watchlist</h2>
        <span style={{ fontSize: 11, color: TEC_COLORS.subtext }}>
          {isPro ? 'Pro · unlimited' : `${watches.length}/${cap} · Pro = unlimited`}
        </span>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={field} value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void add(); }}
            placeholder="Watch something — e.g. Mainnet migration news" maxLength={140} disabled={atCap} />
          <button style={{ ...goldBtn, opacity: busy || atCap ? 0.6 : 1 }} onClick={() => void add()} disabled={busy || atCap}>Add</button>
        </div>
        {atCap && (
          <p style={{ fontSize: 12, color: TEC_COLORS.gold, margin: '10px 0 0' }}>
            🔒 Free plan is {cap} watches. Alert Pro = unlimited — upgrade above.
          </p>
        )}
        {msg && <p style={{ fontSize: 12.5, color: msg.startsWith('🔒') || msg.includes('limit') ? TEC_COLORS.gold : TEC_COLORS.error, margin: '10px 0 0' }}>{msg}</p>}

        <div style={{ marginTop: watches.length ? 12 : 0 }}>
          {watches.length === 0 ? (
            <p style={{ fontSize: 13, color: TEC_COLORS.subtext, marginTop: 12 }}>
              Nothing on your watchlist yet. Add what you don’t want to miss — it’s yours.
            </p>
          ) : (
            watches.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${TEC_COLORS.gold}1f` }}>
                <button onClick={() => void toggle(w)} title={w.done ? 'Mark active' : 'Mark done'}
                  style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, cursor: 'pointer',
                           border: `1px solid ${w.done ? TEC_COLORS.success : TEC_COLORS.gold + '55'}`,
                           background: w.done ? TEC_COLORS.success : 'transparent', color: '#0a0800', fontSize: 12, lineHeight: '18px' }}>
                  {w.done ? '✓' : ''}
                </button>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: w.done ? TEC_COLORS.subtext : TEC_COLORS.text, textDecoration: w.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.title}
                </span>
                <button onClick={() => void remove(w.id)} title="Remove"
                  style={{ background: 'none', border: 'none', color: TEC_COLORS.subtext, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
