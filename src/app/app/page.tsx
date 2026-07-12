'use client';

// TEC Alert — the smart notification hub (C-111, extended). "What do I need to
// know right now?" One inbox that aggregates + classifies signals from every TEC
// app (payments, security, connections, goals, assets, property, verification,
// AI) AND a curated Pi-community feed (mainnet/news/hackathons/scam warnings).
// Alert presents + routes; the owning app owns resolution (C-111 §4). This V1
// reads a curated sample via /api/bff/alert/feed; live delivery (tec-notification-
// service + a Pi news source) is Phase 1+.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePiAuth } from '@yasser172/tec-auth';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { AlertPro } from './components/AlertPro';
import {
  FEED, CATEGORY_META, SEVERITY_META, filterFeed, unreadCount,
  type Source, type Alert,
} from '@/lib/alert/feed';

const TABS: { id: Source | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tec', label: 'My TEC' },
  { id: 'pi',  label: 'Pi Community' },
];

export default function AlertHome() {
  const { user, isLoading } = usePiAuth();
  const name = user?.piUsername ? `@${user.piUsername}` : 'there';

  const [tab,   setTab]   = useState<Source | 'all'>('all');
  const [feed,  setFeed]  = useState<Alert[]>(FEED);
  const [source, setSource] = useState<'sample' | 'live'>('sample');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res  = await fetch('/api/bff/alert/feed', { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (!alive || !data || !Array.isArray(data.feed)) return;
        setFeed(data.feed as Alert[]);
        setSource(data.source === 'live' ? 'live' : 'sample');
      } catch { /* keep the curated sample */ }
    })();
    return () => { alive = false; };
  }, []);

  const shown  = useMemo(() => filterFeed({ source: tab }, feed), [tab, feed]);
  const unread = useMemo(() => unreadCount(feed), [feed]);

  const toneColor = (tone: 'info' | 'good' | 'warn' | 'crit') =>
    tone === 'crit' ? TEC_COLORS.error : tone === 'warn' ? TEC_COLORS.gold
      : tone === 'good' ? TEC_COLORS.success : TEC_COLORS.subtext;

  const tab_ = (active: boolean): React.CSSProperties => ({
    fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
    color: active ? '#0a0800' : TEC_COLORS.text,
    background: active ? `linear-gradient(135deg, ${TEC_COLORS.gold}, ${TEC_COLORS.goldDark})` : 'transparent',
    border: `1px solid ${TEC_COLORS.gold}${active ? '' : '33'}`,
    borderRadius: 999, padding: '7px 16px', cursor: 'pointer',
  });

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>TEC Alert · Smart inbox</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEC_COLORS.gold, margin: '6px 0 0' }}>
            {isLoading ? 'Your alerts' : `Hi ${name}`}
            {unread > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: '#0a0800', background: TEC_COLORS.gold, borderRadius: 999, padding: '2px 10px', marginLeft: 10, verticalAlign: 'middle' }}>{unread} new</span>}
          </h1>
          <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '6px 0 0', lineHeight: 1.6 }}>
            One place for what matters — your TEC activity and the Pi community,
            classified and prioritized. Alert presents; each app owns the action (C-111).
          </p>
        </header>

        {/* Alert Pro — real Pi U2A payment (service subscription). */}
        <AlertPro />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 26 }}>
          {TABS.map((t) => (
            <button key={t.id} style={tab_(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: TEC_COLORS.subtext, border: `1px solid ${TEC_COLORS.gold}33`, borderRadius: 999, padding: '2px 10px' }}>
            {source === 'live' ? 'live · notifications' : 'sample feed'}
          </span>
        </div>

        {/* Feed */}
        <section style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {shown.map((a) => {
            const cat = CATEGORY_META[a.category];
            const sev = SEVERITY_META[a.severity];
            return (
              <Link key={a.id} href={`/alert/${a.id}`} style={{ background: TEC_COLORS.surface, border: `1px solid ${a.unread ? TEC_COLORS.gold + '55' : TEC_COLORS.gold + '1f'}`, borderRadius: 12, padding: 14, display: 'block', textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: TEC_COLORS.text }}>
                    {cat.icon} {a.title}
                    {a.unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: TEC_COLORS.gold, display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }} />}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', color: toneColor(sev.tone), border: `1px solid ${toneColor(sev.tone)}55`, borderRadius: 999, padding: '2px 8px' }}>{sev.label}</span>
                </div>
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>{a.body}</div>
                <div style={{ fontSize: 11, color: TEC_COLORS.gold, marginTop: 6 }}>{cat.label} · {a.app} · {a.ago}</div>
              </Link>
            );
          })}
          {shown.length === 0 && (
            <div style={{ background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`, borderRadius: 12, padding: 20, textAlign: 'center', color: TEC_COLORS.subtext, fontSize: 13 }}>
              Nothing here yet.
            </div>
          )}
        </section>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '24px 0 0', lineHeight: 1.5 }}>
          Alert aggregates + classifies + routes signals — it never resolves the
          incident (the owning app does), enforces security (→ NX), reverses a
          payment (→ tec-payment-service), or takes governance action (→ SYSTEM). C-111 §4.
        </p>
      </div>
    </main>
  );
}
